from flask import make_response
import gzip, pysam, threading, logging, timeit, os, sqlite3
import pandas as pd
import numpy as np
from collections import defaultdict, Counter
import geojson 
import json
import utils
import re
import google.auth.transport.requests
import google.auth
import time
from cloud_storage import CloudStorage
import io

class Datafetch(object):

    def _init_tabix(self):
        self.vcfs_imputed = self.conf['vcf_files']['imputed_data']
        self.vcfs_chip = self.conf['vcf_files']['chip_data']
    
    def _init_db(self):
        self.conn = defaultdict(lambda: sqlite3.connect(self.conf['sqlite_db']))

    def _init_geo_data(self):
        with open(self.conf['geojson'], 'r') as f:
            self.geo_data = geojson.load(f)
    
    def _refresh_gcs_auth_token_if_needed(self):

        current_time = time.time()
        
        # if not read from the bucket or token expiration time is reached 
        if not self.read_vcf_from_bucket or current_time - self.token_retrieval_time < 3600:
            return 
        
        # Update token retrieval time
        self.token_retrieval_time = time.time()

        # Initialize empty credentials
        credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
        
        # Refresh actual credentials
        auth_request = google.auth.transport.requests.Request()
        credentials.refresh(auth_request)

        os.environ["GCS_OAUTH_TOKEN"] = credentials.token
 
    def _init_info(self, select_chip):
        if (self.conf['use_gcp_buckets']):
            info_file = 'gs://'+ self.conf['red_bucket']+'/'+ self.conf['basic_info_file']
        else:
            info_file = self.conf['basic_info_file']
        info = pd.read_csv(info_file, sep='\t').fillna('NA')

        info.index = info['FINNGENID']

        if select_chip:
            vcf = self.vcfs_chip[0]
        else:
            vcf = self.vcfs_imputed[0]

        tabix_iter = pysam.TabixFile(vcf, parser=None)

        # get the header from vcf files
        h = tabix_iter.header[len(tabix_iter.header) - 1].split('\t')
        samples = pd.DataFrame({'finngen_id': h[9:]})
        samples['row_id'] = samples.index
        samples.index = samples['finngen_id']

        # get intersection of samples in vcf file and basic info file - order of samples 
        # must be preserved due to further gt extraction and additon to the output file. 
        # Required for chip data: excluding samples that are uniquily present in vcf files
        samples_intersection = samples.index.intersection(info.index)

        # extract intersecting samples from info and vcf header (in the same order that they are present in VCF)
        # info = info.loc[info.index.intersection(samples), :]
        info = info.loc[samples_intersection, :]
        samples = samples.loc[samples_intersection, : ]
        samples.reset_index(drop=True, inplace=True)   

        # make a copy for writing data out with male/female texts
        info_orig = info.copy()
        # info_orig['SEX'] = np.where(info_orig['SEX'] == 1, 'female', 'male')
        info_orig['DEATH'] = np.where(info_orig['DEATH']=="NA", np.nan, info_orig['DEATH'])
        info_orig['DEATH'] = info_orig['DEATH'].astype('Int64')
        
        # change cohort/region names to index
        # nan values cause error during sorting so fill them first?
        cohort_list = sorted(list(set(info['cohort'].fillna("NA").tolist())))
        cohort_idx = {cohort:i for i,cohort in enumerate(cohort_list)}
        info['cohort'] = info['cohort'].map(cohort_idx)
        
        region_list = sorted(list(set(info['regionofbirthname'].fillna("NA").tolist())))
        region_idx = {region:i for i,region in enumerate(region_list)}
        info['regionofbirth'] = info['regionofbirthname'].map(region_idx)
        info = info.drop(columns=['FINNGENID', 'regionofbirthname'])
        info_columns = info.columns.tolist()

        # remove index
        info.reset_index(drop=True, inplace=True)
        info_orig.reset_index(drop=True, inplace=True)
        return info, info_orig, cohort_list, region_list, info_columns, samples

    def __init__(self, conf):
        self.conf=conf
        self.token_retrieval_time = 0
        self.read_vcf_from_bucket = conf['vcf_files']['read_from_bucket']
        self._refresh_gcs_auth_token_if_needed()
        self._init_tabix()
        self._init_db()
        self._init_geo_data()
        self.info, self.info_orig, self.cohort_list, self.region_list, self.info_columns, \
            self.samples_imput = self._init_info(select_chip=False)
        self.info_chip, self.info_orig_chip, self.cohort_list_chip, self.region_list_chip, \
            self.info_columns_chip, self.samples_chip = self._init_info(select_chip=True)
        
        qc_data = [pd.read_csv(file, header=0, sep="\t", low_memory=False) for file in self.conf['qc']]
        if len(qc_data) == 0:
            qc = pd.DataFrame(columns = ['BATCH', 'VARIANT', 'REASON', 'VALUE'])
        else:
            qc = pd.concat(qc_data)
            qc['VARIANT'] = qc['VARIANT'].apply(lambda x: x.replace('chr', '').replace('_', ':'))
            qc = qc[qc.BATCH.isin(list(self.info.BATCH))]
        self.qc = qc

        axiom = self.info[self.info['BATCH'].apply(lambda x: 'Axiom' in x)]
        legacy = self.info[self.info['BATCH'].apply(lambda x: 'Axiom' not in x)]

        self.total_axiom_batch_count = len(axiom['BATCH'].drop_duplicates())
        self.total_legacy_batch_count = len(legacy['BATCH'].drop_duplicates())
        
    def _get_annotation(self, chr, pos, ref, alt, data_type):
        in_data = 1 if data_type == 'imputed' else 2
        if self.conn[threading.get_ident()].row_factory is None:
            self.conn[threading.get_ident()].row_factory = sqlite3.Row
        c = self.conn[threading.get_ident()].cursor()         
        query = 'SELECT * FROM anno WHERE variant = "%s" AND (in_data=%s OR in_data=3);' % (str(chr) + ':' + str(pos) + ':' + ref + ':' + alt, in_data)
        c.execute(query)
        res = c.fetchone()
        if len(res) > 0:
            return dict(res)
        else:
            raise utils.NotFoundException(str(chr) + '-' + str(pos) + '-' + ref + '-' + alt)

    def _get_genotype_data(self, chr, pos, ref, alt, data_type):

        self._refresh_gcs_auth_token_if_needed()

        chr_var = chr if chr != 23 else 'X'
        if data_type == 'imputed':
            vcf = self.vcfs_imputed[chr-1]
            samples = list(self.samples_imput['row_id'])
        else:
            vcf = self.vcfs_chip[chr-1]
            samples = list(self.samples_chip['row_id'])

        tabix_iter = pysam.TabixFile(vcf, parser=None).fetch('chr'+str(chr_var), pos-1, pos)

        var_data = None
        for row in tabix_iter:
            data = row.split('\t')            
            if data[3] == ref and data[4] == alt:
                var_data = data
                break

        # get only those samples that have information in basic info file
        if var_data is not None:
            res = np.array(var_data[9:])
            return list(res[samples])
        else:
            return None

    def _get_chips(self, chr, pos, ref, alt):
        if self.conn[threading.get_ident()].row_factory is None:
            self.conn[threading.get_ident()].row_factory = sqlite3.Row
        c = self.conn[threading.get_ident()].cursor()
        res = c.execute('SELECT * FROM chip WHERE variant = ?', [str(chr) + ':' + str(pos) + ':' + ref + ':' + alt])
        chips = set([r['chip'] for r in res])
        if len(chips) > 0:
            return chips
        else: # variant doesn't exist in the table if it's not on any chip
            return set()
    
    def _filter(self, df, filters, chips):
        _df = df.copy()
        if 'alive' in filters:
            if filters['alive'] == 'alive':
                _df = _df.loc[_df['DEATH'] == 0]
            elif filters['alive'] == 'dead':
                _df = _df.loc[_df['DEATH'] == 1]
        if 'sex' in filters:
            if filters['sex'] == 'female':
                _df = _df.loc[_df['SEX'] == 1]
            elif filters['sex'] == 'male':
                _df = _df.loc[_df['SEX'] == 0] 
        if 'impchip' in filters:
            if filters['impchip'] == 'chip':
                _df = _df.loc[_df['BATCH'].isin(chips)]
            elif filters['impchip'] == 'imp':
                _df = _df.loc[~_df['BATCH'].isin(chips)]
        if 'array' in filters:
            if filters['array'] == 'finngen':
                _df = _df.loc[_df['ARRAY'] == 1]
            elif filters['array'] == 'legacy':
                _df = _df.loc[_df['ARRAY'] == 0] 
        return _df

    def _is_homozygous_alt(self, gt):
        return gt == '1|1' or gt == '1/1'

    def _is_heterozygous(self, gt):
        return gt == '1|0' or gt == '1/0' or gt == '0|1' or gt == '0/1'

    def _is_homozygous_wt(self, gt):
        return gt == '0|0' or gt =='0/0'
    
    def _is_missing(self, gt):
        return gt == '.|.' or gt =='./.' or gt == '.'

    def _gt_passes_threshold(self, gt_probability, gt_probability_thres):
        return gt_probability >= float(gt_probability_thres)

    def _get_het_hom_index(self, data, index, use_gt, gp_thres, calc_info):
        het_i = []
        hom_alt_i = []
        sum_eij = 0
        sum_fij_minus_eij2 = 0
        wt_hom_i = []
        missing_i = []
        for i in index:
            #GT:DS:GP
            #0|0:0:1,0,0
            s = data[i].split(':')
            gt = s[0]
            if not use_gt or calc_info:
                gp = [float(p) for p in s[2].split(',')]
            if calc_info:
                dosage = float(s[1])
                sum_eij = sum_eij + dosage
                fij_minus_eij2 = 4*gp[2] + gp[1] - dosage*dosage
                sum_fij_minus_eij2 = sum_fij_minus_eij2 + fij_minus_eij2
            if use_gt:
                if self._is_homozygous_alt(gt):
                    hom_alt_i.append(i)
                elif self._is_heterozygous(gt):
                    het_i.append(i)
                elif self._is_homozygous_wt(gt):
                    wt_hom_i.append(i)
                else:
                    missing_i.append(i)
            else:
                if self._is_homozygous_alt(gt) and self._gt_passes_threshold(gp[2], gp_thres):
                    hom_alt_i.append(i)
                elif self._is_heterozygous(gt) and self._gt_passes_threshold(gp[1], gp_thres):
                    het_i.append(i)
                elif self._is_homozygous_wt(gt) and self._gt_passes_threshold(gp[0], gp_thres):
                    wt_hom_i.append(i)
                else:
                    missing_i.append(i)

        if calc_info and len(index)>0:
            theta_hat = sum_eij / (2*len(index))
            info = 1 if theta_hat == 0 or theta_hat == 1 else 1 - sum_fij_minus_eij2 / (2*len(index)*theta_hat*(1-theta_hat))
        else:
            info = -1

        return (het_i, hom_alt_i, wt_hom_i, missing_i, info)
    
    def _aggregate_het_hom(self, het, hom, full, data_type):
        agg = {'regions': {}, 'cohorts': {}}
        if data_type == 'imputed':
            cohort_list = self.cohort_list
            region_list = self.region_list
        else:
            cohort_list = self.cohort_list_chip
            region_list = self.region_list_chip

        for type in [('regions', 'regionofbirth', region_list), ('cohorts', 'cohort', cohort_list)]:
            # gt_count: list of length 2 (het/hom), each is a dict from region/cohort index to het/hom count
            gt_count = [het.groupby(type[1]).size().to_dict(), hom.groupby(type[1]).size().to_dict()]
            # add zeros
            gt_count = [
                [gt_count[0][i] if i in gt_count[0] else 0 for i in range(len(type[2]))],
                [gt_count[1][i] if i in gt_count[1] else 0 for i in range(len(type[2]))]
            ]
            num_indiv = full.groupby(type[1]).size().to_dict()
            num_indiv = [num_indiv[i] if i in num_indiv else 0 for i in range(len(type[2]))]
            # calculate allele frequency
            af = [(cnt+2*gt_count[1][i])/num_indiv[i]/2 if num_indiv[i] > 0 else 0 for i,cnt in enumerate(gt_count[0])]
            agg[type[0]] = {'names': type[2], 'gt_counts': gt_count, 'num_indiv': num_indiv, 'af': af}
        return agg
    
    def _count_gt(self, data, filters, chips, data_type, variants):
        if data_type == 'imputed':
            filtered_basic_info = self._filter(self.info, filters, chips)
            info_df = self.info
            info_columns = self.info_columns
        else:
            filtered_basic_info = self._filter(self.info_chip, filters, chips)
            info_df = self.info_chip
            info_columns = self.info_columns_chip

        id_index = list(filtered_basic_info.index)
        vars = variants.split(',')
        het_i = []
        hom_i = []
        wt_hom_i = []
        missing_i = []
        qcd_i = []
        for i, d in enumerate(data):
            if data_type == 'imputed':
                het_i_d, hom_i_d, wt_hom_i_d, missing_i_d, info = self._get_het_hom_index(d, id_index, filters['gtgp'] == 'gt', filters['gpThres'], len(data) == 1)
                qcd_i_d = self._get_qcd_index(vars[i], filters, chips)
                qcd_i.extend(qcd_i_d)
            else:
                het_i_d, hom_i_d, wt_hom_i_d, missing_i_d, info = self._get_het_hom_index(d, id_index, True, None, False)
            het_i.extend(het_i_d)
            hom_i.extend(hom_i_d)
            wt_hom_i.extend(wt_hom_i_d)
            missing_i.extend(missing_i_d)
        het_cnt = Counter(het_i)
        het_i = set(het_i)
        hom_i = set(hom_i)
        wt_hom_i = set(wt_hom_i)
        missing_i = set(missing_i)
        total_indiv = len(het_i) + len(hom_i) + len(wt_hom_i) + len(missing_i_d)

        # maybe treat multiheterozygotes as homozygotes
        if 'hethom' in filters and filters['hethom']:
            multihet = [i for i in het_cnt if het_cnt[i] > 1]
            hom_i = set().union(hom_i, multihet)
            
        # if an individual is homozygous for a variant, don't count as heterozygous for other variants
        het = info_df.iloc[[i for i in het_i if i not in hom_i]]
        hom = info_df.iloc[list(hom_i)]
        wt_hom = info_df.iloc[list(wt_hom_i)]
        missing = info_df.iloc[list(missing_i)]
        qcd = info_df.iloc[list(qcd_i)]
        agg = self._aggregate_het_hom(het, hom, filtered_basic_info, data_type)
        total_af = (len(het) + 2*len(hom))/len(filtered_basic_info)/2 if len(filtered_basic_info) > 0 else -1
        het = het.to_numpy().T.tolist()
        hom = hom.to_numpy().T.tolist()

        # add wt hom and missing data
        wt_hom = wt_hom.to_numpy().T.tolist()
        missing = missing.to_numpy().T.tolist()
        qcd = qcd.to_numpy().T.tolist()

        return {
            'het': het if len(het) > 0 else [[] for i in info_columns],
            'hom_alt': hom if len(hom) > 0 else [[] for i in info_columns],
            'wt_hom': wt_hom if len(wt_hom) > 0 else [[] for i in info_columns],
            'missing': missing if len(missing) > 0 else [[] for i in info_columns],
            'qcd': qcd if len(qcd) > 0 else [[] for i in info_columns],
            'columns': info_columns,
            'agg': agg,
            'total_af': total_af,
            'info': info,
            'total_indiv': total_indiv,
            'filters': filters,
            'data_type': data_type
        }
    
    def _count_gt_for_write(self, variants, data, filters, chips, data_type):
        start_time = timeit.default_timer()
        df_list = []
        cohort_source = 'Genobrowser[' + self.conf['release_version'] + ']'
        if data_type == 'imputed':
            filtered_basic_info = self._filter(self.info, filters, chips)
            info_orig = self.info_orig
        else:
            filtered_basic_info = self._filter(self.info_chip, filters, chips)
            info_orig = self.info_orig_chip
        id_index = list(filtered_basic_info.index) 
        
        for i, d in enumerate(data):
            # get indices of het/hom individuals in genotype data
            if data_type == 'imputed':
                het_i, hom_alt_i, wt_hom_i, missing_i, info = self._get_het_hom_index(d, id_index, filters['gtgp'] == 'gt', filters['gpThres'], len(data) == 1)
            else:
                het_i, hom_alt_i, wt_hom_i, missing_i, info = self._get_het_hom_index(d, id_index, True, None, False)
            gt = [element.split(':')[0] for element in d ]
            gt_arr = np.array(gt)
            gt_het = list(gt_arr[het_i])
            gt_hom = list(gt_arr[hom_alt_i])
            gt_wt_hom = list(gt_arr[wt_hom_i])

            # subset dataframe for het/hom individuals, copy needed as this will be mutated
            het = info_orig.iloc[het_i].copy()
            hom_alt = info_orig.iloc[hom_alt_i].copy()
            wt_hom = info_orig.iloc[wt_hom_i].copy()
            missing = info_orig.iloc[missing_i].copy()

            # extract gt probs and gts
            if data_type == 'imputed':
                gt_probs = [element.split(':')[2] for element in d ]
                gt_probs_arr = np.array(gt_probs)
                gt_probs_het = list(gt_probs_arr[het_i])
                gt_probs_hom = list(gt_probs_arr[hom_alt_i])
                gt_probs_wt_hom = list(gt_probs_arr[wt_hom_i])
                gt_probs_missing = list(gt_probs_arr[missing_i])
                het['three_gt_probs'] = gt_probs_het
                hom_alt['three_gt_probs'] = gt_probs_hom
                wt_hom['three_gt_probs'] = gt_probs_wt_hom
                missing['three_gt_probs'] = gt_probs_missing
                missing['gt'] = '.|.'
            else:
                missing['gt'] = './.'        

            # add main gt and probs for three genotypes (and missing data for raw chip)
            het['gt'] = gt_het
            hom_alt['gt'] = gt_hom
            wt_hom['gt'] = gt_wt_hom

            # if specified the type of variants to be saved
            df = pd.DataFrame(columns = het.columns.values.tolist())
            
            if json.loads(filters['hom']):
                df = pd.concat([df, hom_alt], ignore_index=True)
                           
            if json.loads(filters['het']):
                df = pd.concat([df, het], ignore_index=True)
            
            if json.loads(filters['wt_hom']):
                df = pd.concat([df, wt_hom], ignore_index=True)
            
            if json.loads(filters['missing']):
                df = pd.concat([df, missing], ignore_index=True)

            # append data frames
            # df = self._filter(df, filters, chips)
            df['variant'] = variants[i].replace('-', ':')
            df['COHORT_SOURCE'] = cohort_source
            df['COHORT_NAME'] = df['variant'] + '-' + df['gt']            
            df_list.append(df)
        
        elapsed = timeit.default_timer() - start_time
        return pd.concat(df_list)
    
    def _anno_contains_var(self, chr, pos, ref, alt):
        if self.conn[threading.get_ident()].row_factory is None:
            self.conn[threading.get_ident()].row_factory = sqlite3.Row
        c = self.conn[threading.get_ident()].cursor()         
        query = 'SELECT * FROM anno WHERE variant = "%s";' % (str(chr) + ':' + str(pos) + ':' + ref + ':' + alt)
        c.execute(query)
        res = c.fetchone()
        r = [0, 0]
        if len(res) > 0:
            src = dict(res)['in_data']
            if src == 3:
                r = [1, 1] # both
            elif src == 1:
                r = [1, 0] # imputed only
            else:
                r = [0, 1] # chip only
        return r

    def _get_qcd_batches(self, variant):
        v = utils.format_variant(variant)        
        qc = self.qc[self.qc['VARIANT'].isin([v])].copy()
        qc = qc[~qc['BATCH'].duplicated()].copy()
        return [] if qc.empty else qc.BATCH.values
    
    def _get_intensity_data(self, variant):
        chr, pos, ref, alt = utils.parse_variant(variant)
        if chr == 23:
            chrom = 'X'
        elif chr == 24:
            chrom = 'Y'
        elif chr == 26:
            chrom = 'MT'
        else:
            chrom = chr
        
        var = "%s_%s_%s_%s" % (chrom, pos, ref, alt)
        filename = '%s/%s/%s.tsv' % (self.conf['intensity_files_location'], chrom, var)
        filename = re.sub('//', '/', filename)
        cloud_storage = CloudStorage()
        clust = cloud_storage.read_bytes(self.conf['red_bucket'], filename)
        fields = self.conf['intensity_data_fields']
        
        if clust is None:
            clustdata = pd.DataFrame(columns = [f.upper() for f in fields])
        else:
            try:
                clustdata = pd.read_csv(io.StringIO(clust.decode()), sep="\t", usecols=fields)
            except Exception as e:
                raise utils.ParseException()
            else:
                clustdata.columns = [c.upper() for c in clustdata.columns]
        
        return clustdata

    def _get_qcd_index(self, variant, filters, chips):
        chr, pos, ref, alt = utils.parse_variant(variant)
        qcd_batches = self._get_qcd_batches("%s:%s:%s:%s" % (chr, pos, ref, alt))
        chips = list(chips)
        chips.extend(qcd_batches)
        df = self.info_orig.copy()
        df = self._filter(df, filters, chips)
        df = df.loc[df.BATCH.isin(qcd_batches)]
        return df.index

    def get_variants(self, variants, filters, data_type):
        start_time = timeit.default_timer()
        filters = {k:(True if v=="true" else v) for k,v in filters.items()}
        filters = {k:(False if v=="false" else v) for k,v in filters.items()}
        if 'gpThres' in filters:
            filters['gpThres'] = float(filters['gpThres'])
        vars_data = []
        anno = []
        vars = []
        for variant in variants.split(','):
            chr, pos, ref, alt = utils.parse_variant(variant)
            var_data = self._get_genotype_data(chr, pos, ref, alt, data_type)
            if var_data is not None:
                vars_data.append(var_data)
                vars.append('-'.join([str(s) for s in [chr, pos, ref, alt]]))
                anno.append(self._get_annotation(chr, pos, ref, alt, data_type))
                
        if len(vars_data) == 0:
            raise utils.NotFoundException()
        fetch_time = timeit.default_timer() - start_time
        start_time = timeit.default_timer()
        chips = self._get_chips(chr, pos, ref, alt) if len(vars_data) == 1 else set()
        if data_type == 'chip':
            if 'impchip' in filters:
                del filters['impchip']
            if 'gtgp' in filters:
                del filters['gtgp']
        data = self._count_gt(vars_data, filters, chips, data_type, variants)
        munge_time = timeit.default_timer() - start_time

        return {
            'variants': vars,
            'annotation': anno,
            'data': data,
            'time': {
                'fetch': fetch_time,
                'munge': munge_time
            },
            'geo_data': self.geo_data,
            'release_version': self.conf['release_version']
        }
    
    def write_variants(self, variants, filters, data_type):

        vars_data = []
        for variant in variants.split(','):
            chr, pos, ref, alt = utils.parse_variant(variant)
            var_data = self._get_genotype_data(chr, pos, ref, alt, data_type)
            if var_data is not None:
                vars_data.append(var_data)
        chips = self._get_chips(chr, pos, ref, alt) if len(vars_data) == 1 else set()
        data_ = self._count_gt_for_write(variants.split(','), vars_data, filters, chips, data_type)

        result = []
        for v in variants.split(','):
            chr, pos, ref, alt = utils.parse_variant(v)
            qcd_batches = self._get_qcd_batches(v)
            if len(qcd_batches) > 0:
                qc = pd.DataFrame({
                    'BATCH': qcd_batches, 
                    'BATCH_QC_FAILED': [1]*len(qcd_batches)}) 
            else:
                qc = pd.DataFrame(columns=['BATCH', 'BATCH_QC_FAILED'])
            
            clustdata = self._get_intensity_data(variant)
            vardata = data_[data_['variant'].isin([v.replace('-', ':')])].copy()
            vardata = pd.merge(vardata, qc, how='left', left_on=['BATCH'], right_on=['BATCH'])
            vardata = pd.merge(vardata, clustdata, how='left', left_on=['FINNGENID'], right_on=['ID'])
            varchips = list(self._get_chips(chr, pos, ref, alt))
            varchips.extend(qcd_batches)
            vardata['BATCH_IN_CHIPS'] = np.where(vardata.BATCH.isin(varchips), 1, 0)
            result.append(vardata)

        data = pd.concat(result)        
        data['BATCH_QC_FAILED'] = np.where(data.apply(lambda x: pd.isna(x.BATCH_QC_FAILED), axis = 1), 0, 1)

        if data_type == 'imputed':
            data['SOURCE'] = 'imputed'
            data.loc[data.apply(lambda x: x.BATCH_IN_CHIPS == 1 and x.BATCH_QC_FAILED == 0, axis = 1), 'SOURCE'] = 'chip'
        else:
            data['SOURCE'] = 'chip'

        gt_download_keys = ['het', 'hom', 'wt_hom', 'missing']
        gt_download = '_'.join([k.replace('_', '') for k in gt_download_keys if filters[k] == 'true'])
        for key in gt_download_keys:
                del filters[key]

        if data_type == 'imputed':
            del filters['data_type']
            filename = variants.replace(',', '_') + '__imputed_data__' + '_'.join([k+'_'+v for k,v in filters.items()]) + '_' + gt_download + '.tsv'
        else:
            for key in ['array', 'impchip', 'data_type']:
                del filters[key]
            filename = variants.replace(',', '_') + '__rawchip_data__' + '_'.join([k+'_'+v for k,v in filters.items()]) + '_' + gt_download + '.tsv'

        data['SEX'] = np.where(data['SEX'] == 1, 'female', 'male')
        data = data.sort_values(by=['FINNGENID'])           
        drop_cols = set(data.columns).intersection(set(['AGE_AT_DEATH_OR_NOW', 'ID', 'BATCH_IN_CHIPS']))
        data = data.drop(columns=drop_cols)
    
        try:
            data.to_csv(sep='\t', index=False, na_rep='NA')
            output = make_response(data.to_csv(sep='\t', index=False, na_rep='NA'))
            output.headers["Content-Disposition"] = "attachment; filename=" + filename
            output.headers["Content-type"] = "text/tab-separated-values"
            return output

        except Exception as e:
            # TODO should return non-200 maybes
            return {'status': 'failed', 'message': str(e)}

    def get_gene_variants(self, gene):
        if self.conn[threading.get_ident()].row_factory is None:
            self.conn[threading.get_ident()].row_factory = sqlite3.Row
        c = self.conn[threading.get_ident()].cursor()
        c.execute('SELECT * FROM genes WHERE gene_name = ? OR gene_name = ?', [gene, gene.upper()])
        gene_db = [dict(row) for row in c.fetchall()]
        if len(gene_db) == 0:
            raise utils.NotFoundException()
        else:
            vars_db = self.get_genomic_range_variants(gene_db[0]['chr'], gene_db[0]['start'], gene_db[0]['end'])
            res_vars = vars_db['data']
        # drop columns we don't show
        exclude_cols = ['gene_most_severe', 'consequence_gnomad', 'chr', 'pos', 'in_data']
        cols = [col for col in res_vars[0].keys() if col not in exclude_cols]
        return {
            'gene': gene,
            'columns': cols,
            'data': res_vars
        }

    def get_genomic_range_variants(self, chr, start, end):
        if self.conn[threading.get_ident()].row_factory is None:
            self.conn[threading.get_ident()].row_factory = sqlite3.Row
        c = self.conn[threading.get_ident()].cursor()
        query = 'SELECT * FROM anno WHERE chr=%s AND pos>=%s AND pos<=%s;' % (chr, start, end)
        c.execute(query)
        res = [dict(row) for row in c.fetchall()]
        if len(res) == 0:
            raise utils.NotFoundException()
        data = []
        for item in res:
            # item['variant'] = '-'.join(item['variant'].split(':'))
            src = 'imputed,chip'
            if item['in_data'] == 1:
                src = 'imputed'
            elif item['in_data'] == 2:
                src = 'chip'
            item['variant'] = "/variant/" + '-'.join(item['variant'].split(':'))
            item['source'] = src
            data.append(item)
        genomic_range = "%s:%s-%s" % (chr, start, end)                     
        exclude_cols = ['gene_most_severe', 'consequence_gnomad', 'chr', 'pos', 'in_data']
        cols = [col for col in data[0].keys() if col not in exclude_cols]
        return {
            'range': genomic_range,
            'columns': cols,
            'data': data
        }
    
    def vcf_contains_var(self, variant, data_type):
        chr, pos, ref, alt = utils.parse_variant(variant)
        var_data = self._get_genotype_data(chr, pos, ref, alt, data_type)
        if var_data is not None:
            return True
        else:
            return False

    def get_var_sources(self, variants):

        # extract possible datatypes for the variants in a query
        # if var is not in the {data type} vcf or anno db, src is 0
        vars_imp = []
        vars_chip = []
        for v in variants.split(','):

            # check if var is in vcf
            chr, pos, ref, alt = utils.parse_variant(v)
            var_imputed_vcf = int(self.vcf_contains_var(v, 'imputed'))
            var_chip_vcf = int(self.vcf_contains_var(v, 'chip'))
            
            # check if var is in annotation db
            var_anno  = self._anno_contains_var(chr, pos, ref, alt)

            # var exists in both, anno and vcf
            var_imputed = (var_imputed_vcf and var_anno[0])
            var_chip = (var_chip_vcf and var_anno[1])
            vars_imp.append(var_imputed)
            vars_chip.append(var_chip)

        # check if the variants exist
        src = {
            'imputed': max(set(vars_imp)),
            'chip': max(set(vars_chip))
        }

        return src
    
    def get_qc_varaints(self, vars):
        varaints = vars.split(',')
        res = []
        for variant in varaints:
            v = utils.format_variant(variant)
            qc = self.qc[self.qc['VARIANT'].isin([v])].copy()
            exclusion_list = []
            for r in qc.groupby(by = "REASON"):
                data = r[1]
                axiom = data[data.apply(lambda x: 'Axiom' in x['BATCH'], axis = 1)].copy()
                legacy = data[data.apply(lambda x: 'Axiom' not in x['BATCH'], axis = 1)].copy()
                p = {
                    'reason': r[0],
                    'axiom_batches': axiom.to_dict('records'),
                    'legacy_batches': legacy.to_dict('records')
                }
                exclusion_list.append(p)

            res.append({
                'variant': variant, 
                'exclusions': exclusion_list, 
                'total_axiom_batch_count': self.total_axiom_batch_count,
                'total_legacy_batch_count': self.total_legacy_batch_count
            })

        return res