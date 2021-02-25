from flask import make_response
import gzip, pysam, threading, logging, timeit, os, sqlite3
import pandas as pd
import numpy as np
from collections import defaultdict, Counter

import utils
import re

class Datafetch(object):

    def _init_tabix(self):
        self.tabix_files_imputed = defaultdict(lambda: [pysam.TabixFile(file, parser=None) for file in self.conf['vcf_files']['imputed_data']])
        self.tabix_files_chip = defaultdict(lambda: [pysam.TabixFile(file, parser=None) for file in self.conf['vcf_files']['chip_data']])

    def _init_db(self):
        self.conn = defaultdict(lambda: sqlite3.connect(self.conf['sqlite_db']))

    def _init_info(self, select_chip):
        info = pd.read_csv(self.conf['basic_info_file'], sep='\t').fillna('NA')
        if select_chip:
            info.index = info['FINNGENID']
            tabix_iter = self.tabix_files_chip[threading.get_ident()][0]
            h = tabix_iter.header[len(tabix_iter.header) - 1].split('\t')
            chip_samples = h[9:]
            info = info.loc[chip_samples, :]

        # make a copy for writing data out with male/female texts
        info_orig = info.copy()
        info_orig['SEX'] = np.where(info_orig['SEX'] == 1, 'female', 'male')
        info_orig['DEATH'] = np.where(info_orig['DEATH']=="NA", np.nan, info_orig['DEATH'])
        info_orig['DEATH'] = info_orig['DEATH'].astype('Int64')
        
        # change cohort/region names to index
        cohort_list = sorted(list(set(info['cohort'].tolist())))
        cohort_idx = {cohort:i for i,cohort in enumerate(cohort_list)}
        info['cohort'] = info['cohort'].map(cohort_idx)
        
        region_list = sorted(list(set(info['regionofbirthname'].tolist())))
        region_idx = {region:i for i,region in enumerate(region_list)}
        info['regionofbirth'] = info['regionofbirthname'].map(region_idx)
        info = info.drop(columns=['FINNGENID', 'regionofbirthname'])
        info.reset_index(drop=True, inplace=True)
        info_columns = info.columns.tolist()

        # remove index
        info.reset_index(drop=True, inplace=True)
        info_orig.reset_index(drop=True, inplace=True)
        return info, info_orig, cohort_list, region_list, info_columns

    def __init__(self, conf):
        self.conf=conf
        self._init_tabix()
        self._init_db()
        self.info, self.info_orig, self.cohort_list, self.region_list, self.info_columns = self._init_info(select_chip=False)
        self.info_chip, self.info_orig_chip, self.cohort_list_chip, self.region_list_chip, self.info_columns_chip = self._init_info(select_chip=True)

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
        chr_var = chr if chr != 23 else 'X'
        if data_type == 'imputed':
            tabix_iter = self.tabix_files_imputed[threading.get_ident()][chr-1].fetch('chr'+str(chr_var), pos-1, pos)
        else:
            tabix_iter = self.tabix_files_chip[threading.get_ident()][chr-1].fetch('chr'+str(chr_var), pos-1, pos)
        var_data = None
        for row in tabix_iter:
            data = row.split('\t')            
            if data[3] == ref and data[4] == alt:
                var_data = data
                break
        return var_data[9:] if var_data is not None else None

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
            # elif filters['alive'] == 'unknown':
            #     _df = _df.loc[_df['DEATH'] == "NA"]
        if 'sex' in filters:
            if filters['sex'] == 'female':
                _df = _df.loc[_df['SEX'] == 1]
            elif filters['sex'] == 'male':
                _df = _df.loc[_df['SEX'] == 0]
        if 'array' in filters:
            if filters['array'] == 'finngen':
                _df = _df.loc[_df['ARRAY'] == 1]
            elif filters['array'] == 'legacy':
                _df = _df.loc[_df['ARRAY'] == 0]
        if 'impchip' in filters:
            if filters['impchip'] == 'chip':
                _df = _df.loc[_df['BATCH'].isin(chips)]
            elif filters['impchip'] == 'imp':
                _df = _df.loc[~_df['BATCH'].isin(chips)]
        return _df

    def _get_het_hom_index(self, data, index, use_gt, gp_thres, calc_info):
        het_i = []
        hom_alt_i = []
        sum_eij = 0
        sum_fij_minus_eij2 = 0
        for i in index:
            #GT:DS:GP
            #0|0:0:1,0,0
            s = data[i].split(':')
            if not use_gt or calc_info:
                gp = [float(p) for p in s[2].split(',')]
            if calc_info:
                dosage = float(s[1])
                sum_eij = sum_eij + dosage
                fij_minus_eij2 = 4*gp[2] + gp[1] - dosage*dosage
                sum_fij_minus_eij2 = sum_fij_minus_eij2 + fij_minus_eij2
            if use_gt:
                gt = s[0]
                if gt == '1|1' or gt == '1/1':
                    hom_alt_i.append(i)
                elif not (gt == '0|0' or gt == '0/0'):
                    het_i.append(i)
            else:
                if gp[2] >= gp_thres:
                    hom_alt_i.append(i)
                elif gp[1] >= gp_thres:
                    het_i.append(i)
        if calc_info and len(index)>0:
            theta_hat = sum_eij / (2*len(index))
            info = 1 if theta_hat == 0 or theta_hat == 1 else 1 - sum_fij_minus_eij2 / (2*len(index)*theta_hat*(1-theta_hat))
        else:
            info = -1
        return (het_i, hom_alt_i, info)

    def _get_het_hom_chip_index(self, data, index):
        het_i = []
        hom_alt_i = []
        sum_eij = 0
        sum_fij_minus_eij2 = 0
        for i in index:
            #GT:DS:GP
            #0|0:0:1,0,0
            s = data[i].split(':')
            if not use_gt or calc_info:
                gp = [float(p) for p in s[2].split(',')]
            if calc_info:
                dosage = float(s[1])
                sum_eij = sum_eij + dosage
                fij_minus_eij2 = 4*gp[2] + gp[1] - dosage*dosage
                sum_fij_minus_eij2 = sum_fij_minus_eij2 + fij_minus_eij2
            if use_gt:
                gt = s[0]
                if gt == '1|1' or gt == '1/1':
                    hom_alt_i.append(i)
                elif not (gt == '0|0' or gt == '0/0'):
                    het_i.append(i)
            else:
                if gp[2] >= gp_thres:
                    hom_alt_i.append(i)
                elif gp[1] >= gp_thres:
                    het_i.append(i)
        if calc_info and len(index)>0:
            theta_hat = sum_eij / (2*len(index))
            info = 1 if theta_hat == 0 or theta_hat == 1 else 1 - sum_fij_minus_eij2 / (2*len(index)*theta_hat*(1-theta_hat))
        else:
            info = -1
        return (het_i, hom_alt_i, info)
    
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
    
    def _count_gt(self, data, filters, chips, data_type):
        if data_type == 'imputed':
            filtered_basic_info = self._filter(self.info, filters, chips)
            info_columns = self.info_columns
        else:
            filtered_basic_info = self._filter(self.info_chip, filters, chips)
            info_columns = self.info_columns_chip
        id_index = list(filtered_basic_info.index)
        het_i = []
        hom_i = []
        for d in data:
            if data_type == 'imputed':
                het_i_d, hom_i_d, info = self._get_het_hom_index(d, id_index, filters['gtgp'] == 'gt', filters['gpThres'], len(data) == 1)
            else:
                het_i_d, hom_i_d, info = self._get_het_hom_index(d, id_index, True, None, False)
            het_i.extend(het_i_d)
            hom_i.extend(hom_i_d)
        het_cnt = Counter(het_i)        
        het_i = set(het_i)
        hom_i = set(hom_i)
        # maybe treat multiheterozygotes as homozygotes
        if 'hethom' in filters and filters['hethom']:
            multihet = [i for i in het_cnt if het_cnt[i] > 1]
            hom_i = set().union(hom_i, multihet)
        # if an individual is homozygous for a variant, don't count as heterozygous for other variants
        het = self.info.iloc[[i for i in het_i if i not in hom_i]]
        hom = self.info.iloc[list(hom_i)]
        agg = self._aggregate_het_hom(het, hom, filtered_basic_info, data_type)
        total_af = (len(het) + 2*len(hom))/len(filtered_basic_info)/2 if len(filtered_basic_info) > 0 else -1
        het = het.to_numpy().T.tolist()
        hom = hom.to_numpy().T.tolist()
        return {
            'het': het if len(het) > 0 else [[] for i in info_columns],
            'hom_alt': hom if len(hom) > 0 else [[] for i in info_columns],
            'columns': info_columns,
            'agg': agg,
            'total_af': total_af,
            'info': info,
            'total_indiv': len(filtered_basic_info),
            'filters': filters
        }
    
    def _count_gt_for_write(self, variants, data, filters, chips, data_type):
        start_time = timeit.default_timer()
        df_list = []
        if data_type == 'imputed':
            filtered_basic_info = self._filter(self.info, filters, chips)
        else:
            filtered_basic_info = self._filter(self.info_chip, filters, chips)
        id_index = list(filtered_basic_info.index) 
        for i, d in enumerate(data):
            # get indices of het/hom individuals in genotype data
            # het_i, hom_alt_i, info = self._get_het_hom_index(d, id_index, filters['gtgp'] == 'gt', filters['gpThres'], len(data) == 1)
            if data_type == 'imputed':
                het_i, hom_alt_i, info = self._get_het_hom_index(d, id_index, filters['gtgp'] == 'gt', filters['gpThres'], len(data) == 1)
            else:
                het_i, hom_alt_i, info = self._get_het_hom_index(d, id_index, True, None, False)
            gt = [element.split(':')[0] for element in d ]
            gt_arr = np.array(gt)
            gt_het = list(gt_arr[het_i])
            gt_hom = list(gt_arr[hom_alt_i])

            # subset dataframe for het/hom individuals, copy needed as this will be mutated
            het = self.info_orig.iloc[het_i].copy()
            hom_alt = self.info_orig.iloc[hom_alt_i].copy()

            # extract gt probs and gts
            if data_type == 'imputed':
                gt_probs = [element.split(':')[2] for element in d ]
                gt_probs_arr = np.array(gt_probs)
                gt_probs_het = list(gt_probs_arr[het_i])
                gt_probs_hom = list(gt_probs_arr[hom_alt_i])
                het['three_gt_probs'] = gt_probs_het
                hom_alt['three_gt_probs'] = gt_probs_hom

            # add main gt and probs for three genotypes
            het['gt'] = gt_het
            hom_alt['gt'] = gt_hom
            # het['het_hom'] = 'het'
            # hom_alt['het_hom'] = 'hom'

            # if specified the type of variants to be saved
            if 'hethom' in filters:
                if filters['hethom'] == 'hom':
                    df = hom_alt
                elif filters['hethom'] == 'het':
                    df = het
                else:
                    # append two data frames
                    df = hom_alt.append(het, ignore_index=True)

            # append data frames
            df = self._filter(df, filters, chips)
            df['variant'] = variants[i].replace('-', ':')
            df_list.append(df)
            
        elapsed = timeit.default_timer() - start_time
        return pd.concat(df_list)

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
        data = self._count_gt(vars_data, filters, chips, data_type)
        munge_time = timeit.default_timer() - start_time
        return {
            'variants': vars,
            'annotation': anno,
            'data': data,
            'time': {
                'fetch': fetch_time,
                'munge': munge_time
            },
            'data_type': data_type
        }

    def check_var_in_chip(self, variant):
        chr, pos, ref, alt = utils.parse_variant(variant)
        var_data = self._get_genotype_data(chr, pos, ref, alt, 'chip')
        if var_data is not None:
            return True
        else:
            return False

    def write_variants(self, variants, filters, data_type):
        vars_data = []
        for variant in variants.split(','):
            chr, pos, ref, alt = utils.parse_variant(variant)
            var_data = self._get_genotype_data(chr, pos, ref, alt, data_type)
            if var_data is not None:
                vars_data.append(var_data)
        chips = self._get_chips(chr, pos, ref, alt) if len(vars_data) == 1 else set()
        data = self._count_gt_for_write(variants.split(','), vars_data, filters, chips, data_type)
        if data_type == 'imputed':
            del filters['data_type']
            filename = variants.replace(',', '_') + '__imputed_data__' + '_'.join([k+'_'+v for k,v in filters.items()]) + '.tsv'
        else:
            for key in ['array', 'impchip', 'data_type']:
                del filters[key]
            filename = variants.replace(',', '_') + '__rawchip_data__' + '_'.join([k+'_'+v for k,v in filters.items()]) + '.tsv'
        data = data.drop(columns=['AGE_AT_DEATH_OR_NOW'])
        try:
            data.to_csv(sep='\t', index=False, na_rep='NA')
            output = make_response(data.to_csv(sep='\t', index=False, na_rep='NA'))

            output.headers["Content-Disposition"] = "attachment; filename=" + filename
            output.headers["Content-type"] = "text/tab-separated-values"
            return output

        except Exception as e:
            # TODO should return non-200 maybes
            return {'status': 'failed', 'message': str(e)}

    def get_gene_variants(self, gene, data_type):
        if self.conn[threading.get_ident()].row_factory is None:
            self.conn[threading.get_ident()].row_factory = sqlite3.Row
        c = self.conn[threading.get_ident()].cursor()
        c.execute('SELECT * FROM genes WHERE gene_name = ?', [gene])
        gene_db = [dict(row) for row in c.fetchall()]
        if len(gene_db) == 0:
            raise utils.NotFoundException()
        else:
            vars_db = self.get_genomic_range_variants(gene_db[0]['chr'], gene_db[0]['start'], gene_db[0]['end'], data_type)
            res_vars = vars_db['data']
        # drop columns we don't show
        exclude_cols = ['gene_most_severe', 'consequence_gnomad', 'chr', 'pos', 'in_data']
        cols = [col for col in res_vars[0].keys() if col not in exclude_cols]
        return {
            'gene': gene,
            'columns': cols,
            'data': res_vars,
            'data_type': data_type
        }

    def get_genomic_range_variants(self, chr, start, end, data_type):
        in_data = 1 if data_type == 'imputed' else 2
        if self.conn[threading.get_ident()].row_factory is None:
            self.conn[threading.get_ident()].row_factory = sqlite3.Row
        c = self.conn[threading.get_ident()].cursor()
        query = 'SELECT * FROM anno WHERE chr=%s AND pos>=%s AND pos<=%s AND (in_data=%s OR in_data=3);' % (chr, start, end, in_data)
        c.execute(query)
        res = [dict(row) for row in c.fetchall()]
        if len(res) == 0:
            raise utils.NotFoundException()
        data = []
        for item in res:
            item['variant'] = '-'.join(item['variant'].split(':'))
            data.append(item)
        genomic_range = "%s:%s-%s" % (chr, start, end)                     
        exclude_cols = ['gene_most_severe', 'consequence_gnomad', 'chr', 'pos', 'in_data']
        cols = [col for col in data[0].keys() if col not in exclude_cols]
        return {
            'range': genomic_range,
            'columns': cols,
            'data': data,
            'data_type': data_type
        }