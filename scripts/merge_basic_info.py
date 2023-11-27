#!/usr/bin/python3
import sys
import argparse
import pandas as pd
import numpy as np
from datetime import datetime

def main():

    # parse the arguments
    parser = argparse.ArgumentParser(description='Script for preparing basic info phenotype file.')
    parser.add_argument('-s', '--sample_list', help='sample list extracted from fgpass factory samples', required=True)
    parser.add_argument('-d', '--death_extracted', help='death field extracted from endpoint', required=True)
    parser.add_argument('-m', '--minimum', help='minimum endpoint data containing cohort column', required=True)
    parser.add_argument('-a', '--array_samples', help='fg factory pass samples', required=True)
    parser.add_argument('-o', '--out_path', help='output path', required=True)
    args = vars(parser.parse_args())

    gt_samples = pd.read_csv(args["sample_list"], names=['FINNGENID'])
    death = pd.read_csv(args["death_extracted"], sep='\t')
    minimum = pd.read_csv(args["minimum"], sep='\t', usecols=['FINNGENID', 'BL_YEAR', 'BL_AGE', 'SEX', 'regionofbirthname', 'COHORT'])
    minimum = minimum.rename(columns={"COHORT": "cohort"})
    array = pd.read_csv(args["array_samples"], sep=':')

    data = gt_samples.merge(death, how='left', on='FINNGENID',suffixes=(None, "_y"))
    data = data.merge(minimum, how='left', on='FINNGENID',suffixes=(None, "_y"))
    data = data.merge(array, how='left', on='FINNGENID',suffixes=(None, "_y"))
    data['AGE_AT_DEATH_OR_NOW'] = np.where(data['DEATH']==1, data['DEATH_FU_AGE'], data['BL_AGE'] + datetime.now().year - data['BL_YEAR'])
    data = data[['FINNGENID', 'DEATH', 'SEX', 'AGE_AT_DEATH_OR_NOW', 'regionofbirthname', 'cohort', 'BATCH', 'CHIP']]
    
    data = data.round({'AGE_AT_DEATH_OR_NOW': 1})
    data['DEATH'] = data['DEATH'].astype('Int64')
    data['SEX'] = np.where(data['SEX'] == 'female', 1, 0)
    data['ARRAY'] = np.where(data['CHIP'].str.startswith('Axiom'), 1, 0)

    data.to_csv(args["out_path"], sep='\t', index=False, na_rep='NA')

if __name__ == '__main__':
    main()

