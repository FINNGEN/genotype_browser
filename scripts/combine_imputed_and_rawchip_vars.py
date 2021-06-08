#!/usr/bin/env python3
# -*- coding: utf-8 -*-


import argparse
import pandas as pd
import numpy as np
import collections
import timeit

def main():

    # parse the arguments
    parser = argparse.ArgumentParser(description='Script for populating annotation db.')
    parser.add_argument('-c', '--chip_anno', help='chip_anno', required=True)
    parser.add_argument('-i', '--imputed_anno', help='imputed_anno', required=True)
    parser.add_argument('-o', '--output', help='output', required=True)
    args = vars(parser.parse_args())

    chip_anno = args['chip_anno']
    imputed_anno = args['imputed_anno']
    output = args['output']

    # read tables
    start_time = timeit.default_timer()
    matr_chip = pd.read_csv(chip_anno, sep="\t")
    matr_impute = pd.read_csv(imputed_anno, compression='gzip', sep="\t")
    cols = {col: col.lower().replace('#', '') for col in matr_impute.columns}
    matr_impute = matr_impute.rename(columns=cols, inplace=False)

    # split rsids
    # TODO gets the first rsid.. whats the best rsid. At this point: get the first rsid
    matr_impute['rsids'] = matr_impute['rsids'].apply(lambda x: x.split(',')[0])
    matr_impute = matr_impute.rename(columns={'rsids': 'rsid'}, inplace=False)

    # raw chip: variant_rsid
    rownames_chip = matr_chip['variant'] + '_' + matr_chip['rsid']
    matr_chip.index = rownames_chip
    print("\nNumber of duplicated variant_rsid pairs in chip anno table: %s" % sum(rownames_chip.duplicated()))

    # imputed: variant_rsid
    rows_imputed = matr_impute['variant'] + '_' + matr_impute['rsid']
    matr_impute['variant_rsid_tmp'] = rows_imputed
    print("Number of duplicated variant_rsid pairs in imputed table: %s" % sum(rows_imputed.duplicated()))

    # unique and intersecting between imputed and chip
    ints = list(set.intersection(set(rownames_chip), set(rows_imputed)))
    unique_chip = list(set.difference(set(rownames_chip), set(rows_imputed)))

    # append unique chips to the matrix and add in_data
    # in_data = 1 when data is in imputed source
    matr_impute['in_data'] = 1
    matr_chip_uniq = matr_chip.loc[unique_chip]
    matr_chip_uniq['in_data'] = 2
    ids = matr_impute['variant_rsid_tmp'].isin(ints)
    matr_impute.loc[ids, 'in_data'] = 3

    # select colnames for combining matrices
    cols = [col for col in matr_impute.columns if col in matr_chip_uniq.columns]
    matr_imp_chip = matr_impute[cols].append(matr_chip_uniq[cols])
    stats = collections.Counter(matr_imp_chip['in_data'])

    # stats
    print("Number of variants across origin type (1=imputed only, 2=rawchip only, 3=both):\n%s" % stats)

    # sort table
    matr_imp_chip['pos'] = pd.to_numeric(matr_imp_chip['pos'])
    matr_imp_chip['chr'] = pd.to_numeric(matr_imp_chip['chr'])
    matr_imp_chip_sorted = matr_imp_chip.sort_values(['chr', 'pos'], ascending=[True, True])
    matr_imp_chip_sorted.pos = matr_imp_chip_sorted.pos.astype('int')
    matr_imp_chip_sorted.chr = matr_imp_chip_sorted.chr.astype('int')
    print("Data sorted, saving the table.")

    # replace NAs
    # matr_imp_chip_sorted = matr_imp_chip_sorted.replace(np.nan, 'NA', regex=True)
    print("Fill NA with a string.")
    for col in matr_imp_chip_sorted.columns:
        print(col)
        matr_imp_chip_sorted[col]=matr_imp_chip_sorted[col].fillna('NA')

    # save output
    matr_imp_chip_sorted.to_csv(output, sep="\t", header=True, index=False)
    print(str((timeit.default_timer() - start_time)/60) +
          ' mins for combining imputed and chip variant annotation file')


if __name__ == '__main__':
    main()
