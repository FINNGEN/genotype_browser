#!/usr/bin/env python3
# -*- coding: utf-8 -*-


import os
import re
import json
import gzip
import timeit
import sqlite3
import argparse
import pandas as pd

def main():

    # parse the arguments
    parser = argparse.ArgumentParser(description='Script for populating annotation db.')
    parser.add_argument('-a', '--input_anno', help='input_anno', required=True)
    parser.add_argument('-o', '--output_anno', help='output_anno', required=True)
    args = vars(parser.parse_args())

    input_anno = args['input_anno']
    output_anno = args['output_anno']

    anno = pd.read_csv(input_anno, compression='gzip', comment='#', sep="\t", header=None)

    # select genes only
    gns = anno.loc[anno.iloc[:, 2].apply(lambda x: x == 'gene'), :]
    gene_names = gns.iloc[:, 8].apply(lambda x: [v.split('gene_name ')[1] for v in x.split(';') if re.search('gene_name', v) is not None][0])
    gene_ids = gns.iloc[:, 8].apply(lambda x: [v.split('gene_id ')[1] for v in x.split(';') if re.search('gene_id', v) is not None][0])
    gene_types = gns.iloc[:, 8].apply(lambda x: [v.split('gene_type ')[1] for v in x.split(';') if re.search('gene_type', v) is not None][0])

    # remove double quotes
    gene_names = gene_names.apply(lambda x: x.replace('"', ''))
    gene_ids = gene_ids.apply(lambda x: x.replace('"', ''))
    gene_types = gene_types.apply(lambda x: x.replace('"', ''))

    # combine columns
    cols = [0, 3, 4, 6]
    res = gns.iloc[:, cols]
    res = res.rename(columns={0: 'chr', 3: 'start', 4: 'end', 6: 'strand'}, inplace=False)
    res['gene_name'] = gene_names
    res['gene_id'] = gene_ids
    res['gene_type'] = gene_types
    res = res.reset_index(drop=True, inplace=False)

    # extract chromosome number foor autosomal chrs
    # and replace chr names with numbers for non-autosomal
    res['chr'] = res['chr'].apply(lambda x: x.replace('chr', ''))
    res['chr'] = res['chr'].apply(lambda x: '23' if x == 'X' else x)
    res['chr'] = res['chr'].apply(lambda x: '24' if x == 'Y' else x)
    res['chr'] = res['chr'].apply(lambda x: '25' if x == 'M' else x)

    # remove duplicates (leave only a single copy) and save to a file
    res_filt_dups = res.drop_duplicates(subset='gene_name', keep='first')
    res_filt_dups.to_csv(output_anno, sep="\t", header=True, index=False)


if __name__ == '__main__':
    main()
