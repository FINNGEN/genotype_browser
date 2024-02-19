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
import traceback
import pandas as pd
import logging
from flask import Flask
from data import Datafetch
from datetime import datetime
from pandas.testing import assert_frame_equal
from typing import Dict


logging.basicConfig(
    format='%(asctime)s %(levelname)-8s %(message)s',
    level=logging.INFO,
    datefmt='%Y-%m-%d %H:%M:%S')
log = logging.getLogger()

app = Flask(__name__, template_folder='../templates', static_folder='../static')


config = {}
try:
	_conf_module = imp.load_source('config', 'config.testing.py')
except Exception as e:
	log.error('Could not load config.testing.py')
	raise


config = {key: getattr(_conf_module, key) for key in dir(_conf_module) if not key.startswith('_')}
fetch = Datafetch(config)


def parse_args():
    ''' Parse argiments '''

    parser = argparse.ArgumentParser(
        description='Tool for comparison of the genotypes extracted from the VCF and genotype browser.',
        usage='use "python %(prog)s --help" for more information',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument('-v', '--variant', 
                        dest='variant', 
                        type=str,
                        default='1-812586-G-A',  
                        help='Variant in the format: CHROM-POS-REF-ALT.',
                        required=False)

    parser.add_argument('-d', '--data_type', 
                        dest='dtype', 
                        type=str, 
                        choices=['imputed', 'chip', 'both'], 
                        default='imputed',
                        help='Specifies dataset from which the variant should be extracted', 
                        required=False)
    
    parser.add_argument('-f', '--filters', 
                        dest='filters', 
                        type=json.loads,
                        default='{"alive": "all", "sex": "all", "array": "all", "impchip": "chip", \
                                 "gtgp": "gt", "gpThres": "0.95", "het": "true", "hom": "true", \
                                 "wt_hom": "true", "missing": "true"}', 
                        help='Specifies filters to apply for fetching data from the genotype browser.', 
                        required=False)

    args = parser.parse_args()
    return args


def test(
        variant: str, dtype: str, filters: Dict
    ) -> bool:
    """ Compare variant genotype data extracted from the GB and VCF """

    log.info(f"Getting genotypes for variant {variant} from {dtype} data")
    
    filters['data_type'] = dtype
    
    chrom, pos, ref, alt = parse_variant(variant)

    chips = fetch._get_chips(chrom, pos, ref, alt)

    gbdat = get_gb_data(variant, filters, dtype)
    
    vcfall = get_vcf_data(chrom, pos, ref, alt, dtype)
    vcfdat = vcfall.loc[list(gbdat.index), :].copy()

    log.info(f"Total CHIPS: {len(chips)} ")
    log.info(f"Samples extracted from the VCF: {len(vcfdat)} out of total {len(vcfall)}")
    log.info(f"Samples extracted from the GB: {len(gbdat)}")

    errors = []    
 
    if filters['impchip'] == 'chip':
        if len(chips) == 0:           
            try:
                assert gbdat.empty, f"Impchip filter is set to `chip` and {len(chips)} chips are found but {len(gbdat)} samples are extracted"
            except Exception as e:
                log.error(e)
                errors.append(e)
        else:
            if len(vcfdat) != 0:
                try:
                    assert not gbdat.empty, f"Impchip filter is set to `chip` and {len(chips)} chips are found but {len(gbdat)} samples are extracted"
                except Exception as e:
                    log.error(e)
                    errors.append(e)

    elif filters['impchip'] == 'imp':
        if len(chips) == 0:
            try:
                assert_frame_equal(vcfdat, gbdat, check_dtype=False)
            except AssertionError as e:
                log.error(e)
                errors.append(e)
        else:
            try:
                assert not gbdat.empty, f"Impchip filter is set to `imp` and {len(chips)} chips are found but {len(gbdat)} samples are extracted"
            except Exception as e:
                log.error(e)
                errors.append(e)

    else:
        try:
            assert_frame_equal(vcfdat, gbdat, check_dtype=False)
        except AssertionError as e:
            log.error(e)
            errors.append(e)

    try:
        if vcfdat.empty:
            assert gbdat.empty, f"No data extracted from VCF, but there are {len(gbdat)} samples extracted from the GB"
    except Exception as e:
        log.error(e)
        errors.append(e)
    
    if len(errors) > 0:
        sys.exit('FAIL')
    else:
        sys.exit('PASS')


def parse_variant(
        variant: str
    ) -> (int, int, str, str):
    """ Parse variant into chrom, pos, ref, alt """
    
    chrom, pos, ref, alt = re.split(':|-|_', variant)

    return int(chrom), int(pos), ref, alt 


def get_gb_data(
        variant: str, filters: dict, dtype
    ) -> pd.DataFrame:
    """
    Get variant genotype data from the GB by using `write_variants`
    api method and writing data to a string in pandas data frame object. 
    """
    
    with app.app_context():
        try:
            response = fetch.write_variants(variant, filters, dtype)
        except ValueError as e:
            log.info(e)
            return pd.DataFrame()
        else:
            text = response.data
            df = pd.read_csv(io.StringIO(text.decode()), sep='\t', low_memory=False)
            df.index = list(df['FINNGENID'])
            df = df[['FINNGENID', 'gt']]
            return df


def get_vcf_data(
        chrom: int, pos: int, ref: str, alt: str, dtype: str
    ) -> pd.DataFrame:
    """ 
    Get variant genotype data from the VCF file for all samples 
    in pandas data frame object.
    """

    dt = "%s_data" % dtype
    filename = config['vcf_files'][dt][chrom-1]
    x = pysam.TabixFile(filename, parser=None)

    chrom = "chrX" if chrom == 23 else "chr%s" % chrom
    data = x.fetch(chrom, pos-1, pos)
    
    gt = None
    for row in data:
        data = row.split('\t')   
        if data[3] == ref and data[4] == alt:
            gt = data
            break
    
    if gt is None:
        return pd.DataFrame()

    else:
        samples = x.header[len(x.header) - 1].split('\t')
        d = pd.DataFrame({'FINNGENID': samples, 'gt_': gt})
        d = d.iloc[9:, ]
        d['gt'] = [item.split(':')[0] for item in d['gt_']]
        df = d[['FINNGENID', 'gt']]
        df.index = list(df['FINNGENID'])
        return df


if __name__ == '__main__':

    args = parse_args()

    log.info(f"Variant: {args.variant}, Filters: {json.dumps(args.filters, indent = 2)}")

    if args.dtype == 'both':
        test(args.variant, "imputed", args.filters)
        test(args.variant, "chip", args.filters)

    elif args.dtype == 'imputed':
        test(args.variant, "imputed", args.filters)    
    
    else:
        test(args.variant, "chip", args.filters)
    

