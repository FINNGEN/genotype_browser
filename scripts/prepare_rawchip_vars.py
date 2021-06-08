#!/usr/bin/env python3
# -*- coding: utf-8 -*-


import argparse
import pandas as pd
import numpy as np
import json
from collections import Counter

def main():

    # parse the arguments
    parser = argparse.ArgumentParser(description='Script for populating annotation db.')
    parser.add_argument('-g', '--gnomad_chip_anno_genomes', help='GnomAD variant annotation genomes', required=True)
    parser.add_argument('-e', '--gnomad_chip_anno_exomes', help='GnomAD variant annotation exomes', required=True)
    parser.add_argument('-a', '--vep_chip_anno', help='VEP FinnGen Chip annotation', required=True)
    parser.add_argument('-o', '--output', help='output', required=True)
    args = vars(parser.parse_args())

    gnomad_chip_anno_genomes = args['gnomad_chip_anno_genomes']
    gnomad_chip_anno_exomes = args['gnomad_chip_anno_exomes']
    vep_chip_anno = args['vep_chip_anno']
    output = args['output']

    # read tables
    gnomad_genomes = pd.read_csv(gnomad_chip_anno_genomes, compression='gzip', sep="\t")
    gnomad_exomes = pd.read_csv(gnomad_chip_anno_exomes, compression='gzip', sep="\t")
    chip_anno = pd.read_csv(vep_chip_anno, compression='gzip', sep="\t")

    # add gnomad_type col to the gnomad column
    gnomad_genomes['gnomad_type'] = "genomes"
    gnomad_exomes['gnomad_type'] = "exomes"

    # filter all NA rsids
    gnomad_genomes = gnomad_genomes.loc[gnomad_genomes['rsid'].apply(lambda x: x is not np.NaN)]
    gnomad_exomes = gnomad_exomes.loc[gnomad_exomes['rsid'].apply(lambda x: x is not np.NaN)]

    # check dups
    rownames_genomes = gnomad_genomes["variant"] + '_' + gnomad_genomes["rsid"]
    rownames_exomes = gnomad_exomes["variant"] + '_' + gnomad_exomes["rsid"]
    gnomad_genomes.index = rownames_genomes
    gnomad_exomes.index = rownames_exomes
    chip_anno.index = chip_anno['#variant']

    print("\nNumber of duplicated variant_rsid pairs in GnomAD genomes: %s" % sum(rownames_genomes.duplicated()))
    print("Number of duplicated variant_rsid pairs in GnomAD exomes: %s" % sum(rownames_exomes.duplicated()))

    # get intersections and uniq vars b/w gnomad
    ints = list(set.intersection(set(rownames_genomes), set(rownames_exomes)))
    unique_genomes = list(set.difference(set(rownames_genomes), set(rownames_exomes)))
    unique_exomes = list(set.difference(set(rownames_exomes), set(rownames_genomes)))

    print("Number of intersecting variants between gnomad genomes and exomes: %s" % len(ints))
    print("Number of unique variants in gnomad genomes: %s" % len(unique_genomes))
    print("Number of unique variants in gnomad exomes: %s" % len(unique_exomes))

    # combine data
    print("\nCombine gnomad genomes and exomes data")
    cols = ['variant', 'rsid', 'fin.AF_genomes', 'nfsee.AF_genomes', 'enrichment_nfsee_genomes',
            'consequence_genomes', 'fin.AF_exomes', 'nfsee.AF_exomes', 'enrichment_nfsee_exomes',
            'consequence_exomes']

    rows_combined = list(ints) + list(unique_genomes) + list(unique_exomes)
    m_gnomad = pd.DataFrame(np.nan, index=rows_combined, columns=cols)
    get_var = np.vectorize(lambda x: x.split('_')[0])
    get_rsid = np.vectorize(lambda x: x.split('_')[1])

    # fill in intersecting records
    m_gnomad.loc[ints, 'variant'] = get_var(np.array(ints))
    m_gnomad.loc[ints, 'rsid'] = get_rsid(np.array(ints))
    m_gnomad = fillin_genomes(m_gnomad, gnomad_genomes, ints)
    m_gnomad = fillin_exomes(m_gnomad, gnomad_exomes, ints)

    # fill in unique records from genomes
    m_gnomad.loc[unique_genomes, 'variant'] = get_var(np.array(unique_genomes))
    m_gnomad.loc[unique_genomes, 'rsid'] = get_rsid(np.array(unique_genomes))
    m_gnomad = fillin_genomes(m_gnomad, gnomad_genomes, unique_genomes)

    # fill in unique records from exomes
    m_gnomad.loc[unique_exomes, 'variant'] = get_var(np.array(unique_exomes))
    m_gnomad.loc[unique_exomes, 'rsid'] = get_rsid(np.array(unique_exomes))
    m_gnomad = fillin_exomes(m_gnomad, gnomad_exomes, unique_exomes)

    # append data from finngen chip annotation pipeline
    print("\nAppend data from finngen chip annotation pipeline")
    m_fg_chip = pd.DataFrame(np.nan, index=rows_combined, columns=chip_anno.columns)
    m_fg_chip['#variant'] = m_gnomad['variant']
    chip_ints = m_fg_chip['#variant'].loc[m_fg_chip['#variant'].isin(chip_anno['#variant'])]
    for col in m_fg_chip.columns[1:]:
        print(col)
        m_fg_chip.loc[list(chip_ints.index), col] = list(chip_anno.loc[list(chip_ints), col])

    # combine gnomad and finngen chip
    print("\nCombine prepared gnomad and finngen chip data frames")
    m_full = pd.concat([m_fg_chip, m_gnomad], axis=1)

    print("Number of variants in the chip annotation table: %s" % m_full.shape[0])
    print("Number of variants from finngen chip annotation pipeline that are present in gnomad annotations: %s" %
          len(chip_ints))
    print("Number of variants that are in gnomad but not in finngen chip annotation: %s. Omitting." %
          sum(m_full['AC_Het'].apply(lambda x: np.isnan(x))))
    m_full = m_full.loc[m_full['AC_Het'].apply(lambda x: not np.isnan(x))]
    print("After filtering variants that are in gnomad but not in finngen chip annotation: %s" % m_full.shape[0])

    # select and rename columns
    m_full['info'] = np.NaN
    cols_selected = ['#variant','chr','pos','rsid', 'fin.AF_genomes', 'info',
                     'enrichment_nfsee_genomes', 'enrichment_nfsee_exomes',
                     'gene_most_severe', 'most_severe', 'consequence_genomes']
    m_full = m_full[cols_selected]
    m_full = m_full.rename(columns={'#variant': 'variant', 'fin.AF_genomes': 'af',
                                    'consequence_genomes': 'consequence_gnomad'}, inplace=False)

    # check number of vars by chr
    m_full['chr'] = pd.to_numeric(m_full['chr'])
    stats = Counter(m_full['chr'])
    print("\nNumber of variants per chromosome:")
    print(json.dumps(stats, indent=2, sort_keys=True))

    # sort and save chip annotation files
    m_full['pos'] = pd.to_numeric(m_full['pos'])
    m_full_sorted = m_full.sort_values(['chr', 'pos'], ascending=[True, True])
    m_full_sorted.pos = m_full_sorted.pos.astype('int')
    # m_full_sorted = m_full_sorted.replace(np.nan, 'NA', regex=True)
    m_full_sorted.to_csv(output, sep="\t", header=True, index=False)


def fillin_genomes(df_dest, df_src, inds):
    df_dest.loc[inds, 'fin.AF_genomes'] = df_src.loc[inds, 'fin.AF']
    df_dest.loc[inds, 'nfsee.AF_genomes'] = df_src.loc[inds, 'nfsee.AF']
    df_dest.loc[inds, 'enrichment_nfsee_genomes'] = df_src.loc[inds, 'enrichment_nfsee']
    df_dest.loc[inds, 'consequence_genomes'] = df_src.loc[inds, 'consequence']
    return df_dest


def fillin_exomes(df_dest, df_src, inds):
    df_dest.loc[inds, 'fin.AF_exomes'] = df_src.loc[inds, 'fin.AF']
    df_dest.loc[inds, 'nfsee.AF_exomes'] = df_src.loc[inds, 'nfsee.AF']
    df_dest.loc[inds, 'enrichment_nfsee_exomes'] = df_src.loc[inds, 'enrichment_nfsee']
    df_dest.loc[inds, 'consequence_exomes'] = df_src.loc[inds, 'consequence']
    return df_dest


if __name__ == '__main__':
    main()
