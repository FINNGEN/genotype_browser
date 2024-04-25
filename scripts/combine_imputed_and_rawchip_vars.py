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
    print("\nReading annotation for the chip data.")
    start_time = timeit.default_timer()
    matr_chip = pd.read_csv(chip_anno, sep="\t", usecols=['#variant', 'chr', 'pos', 'rsid', 'gene_most_severe', 
        'most_severe', 'GENOME_enrichment_nfee', 'EXOME_enrichment_nfsee', 'AF', 'GENOME_AF_fin', 'EXOME_AF_fin', 'GENOME_AF_nfee', 'EXOME_AF_nfsee']).rename(
            columns=str.lower)
    matr_chip.columns=matr_chip.columns.str.replace('#','')
    print("\tData read.")

    #add the info field to the chip annotation file which was previously done in 'prepare_rawchip_vars.py'
    matr_chip['info'] = np.NaN

    # engine=c is important to avoid running out of memory since the file is very big
    print("\nReading annotation for the imputed data.")
    matr_impute = pd.read_csv(imputed_anno, sep="\t", engine="c",
            usecols=['#variant', 'chr', 'pos', 'rsid', 'gene_most_severe', 'most_severe', 
            'GENOME_enrichment_nfee', 'EXOME_enrichment_nfsee', 'INFO','AF', 'GENOME_AF_fin', 'EXOME_AF_fin', 'GENOME_AF_nfee', 'EXOME_AF_nfsee']).rename(
                    columns=str.lower)
    print("\tData read.")
    matr_impute.columns=matr_impute.columns.str.replace('#','')

    matr_impute.info()
    matr_chip.info()

    # raw chip indices
    matr_chip.index = matr_chip['variant']

    # imputed indices
    matr_impute.index = matr_impute['variant']
    matr_impute['variant_rsid_tmp'] = matr_impute['variant']

    # unique and intersecting between imputed and chip
    ints = list(set.intersection(set(matr_chip.index), set(matr_impute.index)))
    unique_chip = list(set.difference(set(matr_chip.index), set(matr_impute.index)))

    # append unique chips to the matrix and add in_data
    # in_data = 1 when data is in imputed source
    matr_impute['in_data'] = 1
    matr_chip_uniq = matr_chip.loc[unique_chip]
    matr_chip_uniq['in_data'] = 2
    ids = matr_impute['variant_rsid_tmp'].isin(ints)
    matr_impute.loc[ids, 'in_data'] = 3

    # select colnames for combining matrices
    cols = [col for col in matr_impute.columns if col in matr_chip_uniq.columns]
    matr_imp_chip = pd.concat([matr_impute[cols], matr_chip_uniq[cols]])
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

    # save output
    matr_imp_chip_sorted.to_csv(output, sep="\t", header=True, index=False)
    print(str((timeit.default_timer() - start_time)/60) +
          ' mins for combining imputed and chip variant annotation file')


if __name__ == '__main__':
    main()



