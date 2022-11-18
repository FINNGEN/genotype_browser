#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import io
import re
import imp
import sys
import json
import time
import pysam
import argparse
import pandas as pd
from flask import Flask
from data import Datafetch
from datetime import datetime
from pandas.testing import assert_frame_equal


start = time.time()
app = Flask(__name__, template_folder='../templates', static_folder='../static')

config = {}
try:
	_conf_module = imp.load_source('config', '../config.py')
except Exception as e:
	print('Could not load config.py')
	raise

config = {key: getattr(_conf_module, key) for key in dir(_conf_module) if not key.startswith('_')}
fetch = Datafetch(config)


def main():

    # parse the arguments
    parser = argparse.ArgumentParser(description='Tool for comparison of the genotypes extracted from the VCF and genotype browser.')

    # parameters used for modules and runs specifications
    parser.add_argument('-v', '--variant', default='12-71584145-G-T',  
                        help='Variant in the format: CHROM-POS-REF-ALT, default: 12-71584145-G-T', required=False)
    parser.add_argument('-d', '--data_type', choices=['imputed', 'chip', 'both'], default='both', 
                        help='Specifies dataset from which the variant should be extracted.', required=False)
    parser.add_argument('-f', '--filters', default='{"alive": "all", "sex": "all", "array": "all", "impchip": "all", \
                        "gtgp": "gt", "gpThres": "0.95", "het": "true", "hom": "true", "wt_hom": "true", "missing": "true"}', 
                        help='Specifies filters to apply for fetching data from the genotype browser. The default genotype browser filters are used by default.', 
                        required=False)
    parser.add_argument('-s', '--save', type=str2bool, default=False, 
                        help='Save sample info extracted from genotype browser with non-equal gts to a separate file.', 
                        required=False)
    
    args = vars(parser.parse_args())
    variant = args['variant']
    data_type = args['data_type']
    filters = json.loads(args['filters'])
    save_output = args['save']

    count = 0
    success = True
    if data_type == 'both' or data_type == 'chip':
        filters['data_type'] = "chip"
        res = getData(variant, filters, "chip")
        if res[0] is None and res[1] is None:
            print("Genotype data not found.")
        else:
            print("Genotype data extracted.")
            eq = assert_equal_df(res)
            success = False if not eq else True
            if not eq and save_output:
                get_nonequal_and_save(res, variant, filters)
        count += 1

    if data_type == 'both' or data_type == 'imputed':
        filters['data_type'] = "imputed"
        res = getData(variant, filters, "imputed")
        if res[0] is None and res[1] is None:
            print("Genotype data not found.")
        else:
            print("Genotype data extracted.")
            eq = assert_equal_df(res)
            success = False if not eq else True
            if not eq and save_output:
                get_nonequal_and_save(res, variant, filters)
        count += 1

    end = time.time()

    print("\n--------------------------------------------------")
    print("Ran %s tests in %ss.\n" % (count, round(end - start, 4)))
    if success:
        print('OK')
    else:
        print('Fail')


def get_nonequal_and_save(dfs, variant, filters):

    # prepare filenameout 
    keys = ['het', 'hom', 'wt_hom', 'missing']
    gt_download = '_'.join([k.replace('_', '') for k in keys if filters[k] == 'true'])
    for key in keys:
        del filters[key]
    fout = "%s_%s_%s_nonequalGT.tsv" % (variant, '_'.join(f'{key}_{value}' for key, value in filters.items()), gt_download)

    # get non-equal rows
    ind = dfs[0] != dfs[1]
    tot = dfs[2][list(ind['gt'])]
    tot['vcf_gt'] = list(dfs[0].loc[list(ind['gt'])]['gt'])
    tot = tot.reset_index(drop=True)

    # save output if specified so
    tot.to_csv(fout, sep="\t", index=False)
    print("Saved to", fout)


def assert_equal_df(dfs):    
    # assert data frames are equal
    try:
        assert_frame_equal(dfs[0], dfs[1], check_dtype=False)
    except AssertionError as e:
        print("ERROR :: %s." % e)
        return False
    else:
        return True


def getData(variant, filters, data_type):
    print("\nGetting genotypes for variant %s from %s data." % (variant, data_type))
    chr, pos, ref, alt = variant.split('-')
    if chr.startswith('chr'):
        chr = re.sub(r"[^0-9]+", "", chr)
    if chr == 'X' or chr == '23':
        chr_search = 'X'
        chr = '23'
    else:
        chr_search = chr
    chr = int(chr)
    pos = int(pos)
    with app.app_context():
        # get write data from genotype browser
        try:
            response = fetch.write_variants(variant, filters.copy(), data_type)
        except ValueError as e:
            # print("ValueError :: %s" % e)
            dat_gb_full = None
        else:
            text = response.data
            dat_gb_full = pd.read_csv(io.StringIO(text.decode()), sep='\t', low_memory=False)
            # dat_gb = dat_gb[['FINNGENID', 'gt']]
            dat_gb_full.index = list(dat_gb_full['FINNGENID'])
        
        # extract genotypes directly from the vcf directly
        if data_type == 'imputed':
            vcf = config['vcf_files']['imputed_data'][chr-1]
        else:
            vcf = config['vcf_files']['chip_data'][chr-1]
        
        # check vcf files
        x = pysam.TabixFile(vcf, parser=None)
        gt_data = x.fetch("chr%s" % chr_search, pos - 1, pos)
        gt = None
        for row in gt_data:
            data = row.split('\t')      
            if data[3] == ref and data[4] == alt:
                gt = data
                break
        
        # construct data frame
        if gt is None:
            dat_vcf = None
        else:
            samples = x.header[len(x.header) - 1].split('\t')
            d = pd.DataFrame({'FINNGENID': samples, 'gt_': gt})
            d = d.iloc[9:, ]
            d['gt'] = [item.split(':')[0] for item in d['gt_']]
            dat_vcf = d[['FINNGENID', 'gt']]
            dat_vcf.index = list(dat_vcf['FINNGENID'])
        
        # re-order
        dat_gb = None
        if dat_gb_full is not None:
            dat_gb = dat_gb_full[['FINNGENID', 'gt']].copy()
            dat_vcf = dat_vcf.loc[list(dat_gb.index), :]
    
    return dat_vcf, dat_gb, dat_gb_full


def str2bool(v):
    if isinstance(v, bool):
        return v
    if v.lower() in ('yes', 'true', 't', 'y', '1'):
        return True
    elif v.lower() in ('no', 'false', 'f', 'n', '0'):
        return False
    else:
        raise argparse.ArgumentTypeError('Boolean value expected.')


if __name__ == '__main__':
    main()
