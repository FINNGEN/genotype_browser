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
from pandas.testing import assert_frame_equal


start = time.time()
app = Flask(__name__, template_folder='../templates', static_folder='../static')

config = {}
try:
	_conf_module = imp.load_source('config', 'config.py')
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
                        "gtgp": "gt", "gpThres": "0.95", "het": "true", "hom": "true", "wt_hom": "true", "missing": "true", "data_type": "imputed"}', 
                        help='Specifies filters to apply for fetching data from the genotype browser. The default genotype browser filters are used by default.', 
                        required=False)
    
    args = vars(parser.parse_args())
    variant = args['variant']
    data_type = args['data_type']
    filters = json.loads(args['filters'])

    count = 0
    success = True
    if data_type == 'both' or data_type == 'chip':
        res = getData(variant, filters, "chip")
        if res[0] is None and res[1] is None:
            print("Genotype data not found.")
        else:
            print("Genotype data extracted.")
            eq = assert_equal_df(res)
            success = False if not eq else True
        count += 1

    if data_type == 'both' or data_type == 'imputed':
        res = getData(variant, filters, "imputed")
        if res[0] is None and res[1] is None:
            print("Genotype data not found.")
        else:
            print("Genotype data extracted.")
            eq = assert_equal_df(res)
            success = False if not eq else True
        count += 1

    end = time.time()

    print("\n--------------------------------------------------")
    print("Ran %s tests in %ss.\n" % (count, round(end - start, 4)))
    if success:
        print('OK')
    else:
        print('Fail')


def assert_equal_df(df_tuple):
    # assert data frames are equal
    try:
        assert_frame_equal(df_tuple[0], df_tuple[1], check_dtype=False)
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
    chr = int(chr)
    pos = int(pos)
    with app.app_context():
        # get write data from genotype browser
        try:
            response = fetch.write_variants(variant, filters.copy(), data_type)
        except ValueError as e:
            # print("ValueError :: %s" % e)
            dat_gb = None
        else:
            text = response.data
            dat_gb = pd.read_csv(io.StringIO(text.decode()), sep='\t', low_memory=False)
            dat_gb = dat_gb[['FINNGENID', 'gt']]
            dat_gb.index = list(dat_gb['FINNGENID'])

        # extract genotypes directly from the vcf directly
        if data_type == 'imputed':
            vcf = config['vcf_files']['imputed_data'][chr-1]
        else:
            vcf = config['vcf_files']['chip_data'][chr-1]

        # check vcf files
        x = pysam.TabixFile(vcf, parser=None)
        gt_data = x.fetch("chr%s" % chr, pos - 1, pos)
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
        if dat_gb is not None:
            dat_vcf = dat_vcf.loc[list(dat_gb.index), :]

    return dat_vcf, dat_gb



if __name__ == '__main__':
    main()
