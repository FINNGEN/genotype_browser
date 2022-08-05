#!/usr/bin/env python3
# -*- coding: utf-8 -*-


import os
import sys
import json
import gzip
import timeit
import sqlite3
import argparse
import requests

def main():

    # parse the arguments
    parser = argparse.ArgumentParser(description='Script for populating annotation db.')
    parser.add_argument('-v', '--variant_annotation_file', help='variant_annotation_file', required=True)
    parser.add_argument('-c', '--variant_chip_file', help='variant_chip_file', required=True)
    parser.add_argument('-g', '--genes_anno_file', help='genes_anno_file', required=True)
    parser.add_argument('-s', '--sqlite_db', help='sqlite_db', required=True)
    args = vars(parser.parse_args())

    populate_genes(args)
    populate_chip(args)
    populate_anno(args)


def generate_entries(varf):
    with gzip.open(varf, 'rt') as f:
        h = {h:i for i,h in enumerate(f.readline().strip().split('\t'))}
        for line in f:
            s = line.strip().split('\t')
            yield((s[h['variant']], s[h['chr']], s[h['pos']], s[h['rsid']], s[h['af']], s[h['info']], 
                s[h['genome_enrichment_nfee']], s[h['exome_enrichment_nfsee']], 
                s[h['genome_af_fin']], s[h['exome_af_fin']], 
                s[h['genome_af_nfee']], s[h['exome_af_nfsee']], 
                s[h['gene_most_severe']], s[h['most_severe']], s[h['in_data']]))


def populate_anno(config):
    start_time = timeit.default_timer()
    f = config['variant_annotation_file']
    conn = sqlite3.connect(config['sqlite_db'])
    c = conn.cursor()
    c.execute('DROP TABLE IF EXISTS anno')
    c.execute('CREATE TABLE anno (variant text, chr text, pos integer, rsid text, af real, info real, \
        enrichment_nfee_genomes real, enrichment_nfsee_exomes real, \
        af_fin_genomes real, af_fin_exomes real, \
        af_nfee_genomes real, af_nfsee_exomes real, \
        gene_most_severe text, most_severe text, in_data integer)')

    c.executemany('INSERT INTO anno VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', generate_entries(f))
    print(str(timeit.default_timer() - start_time) + ' seconds pushing anno')
    start_time = timeit.default_timer()
    c.execute('CREATE INDEX variant_idx ON anno (variant ASC)')
    c.execute('CREATE INDEX gene_idx ON anno (gene_most_severe ASC)')
    c.execute('CREATE INDEX rsid_idx ON anno (rsid ASC)')
    c.execute('CREATE INDEX chr_idx ON anno (chr ASC)')
    c.execute('CREATE INDEX pos_idx ON anno (pos ASC)')
    c.execute('CREATE INDEX in_data_idx ON anno (in_data ASC)')
    c.execute('CREATE INDEX chr_pos_idx ON anno (chr, pos)')
    c.execute('CREATE INDEX chr_pos_in_data_idx ON anno (chr, pos, in_data)')
    c.execute('CREATE INDEX rsid_in_data_idx ON anno (rsid, in_data)')
    c.execute('CREATE INDEX variant_in_data_idx ON anno (variant, in_data)')

    print(str(timeit.default_timer() - start_time) + ' seconds creating index for anno')
    conn.commit()
    conn.close()

def populate_chip(config):
    start_time = timeit.default_timer()
    conn = sqlite3.connect(config['sqlite_db'])
    c = conn.cursor()
    c.execute('DROP TABLE IF EXISTS chip')
    c.execute('CREATE TABLE chip (variant text, chip text)')
    entries = []
    with gzip.open(config['variant_chip_file'], 'rt') as f:
        for line in f:
            s = line.strip().split('\t')
            entries.append((s[0], s[1]))
    c.executemany('INSERT INTO chip VALUES (?, ?)', entries)
    print(str(timeit.default_timer() - start_time) + ' seconds pushing chip')
    start_time = timeit.default_timer()
    c.execute('CREATE INDEX variantchip_idx ON chip (variant ASC)')
    print(str(timeit.default_timer() - start_time) + ' seconds creating index for chip')
    conn.commit()
    conn.close()

def populate_genes(config):
    start_time = timeit.default_timer()
    conn = sqlite3.connect(config['sqlite_db'])
    c = conn.cursor()
    c.execute('DROP TABLE IF EXISTS genes')
    c.execute('CREATE TABLE genes (chr text, start integer, end integer, strand text, gene_name text, gene_id text, gene_type text)')
    entries = []

    with open(config['genes_anno_file'], 'rt') as f:
        h = {h:i for i,h in enumerate(f.readline().strip().split('\t'))}
        for line in f:
            s = line.strip().split('\t')
            entries.append((s[h['chr']], s[h['start']], s[h['end']], s[h['strand']], s[h['gene_name']], s[h['gene_id']], s[h['gene_type']]))

    c.executemany('INSERT INTO genes VALUES (?, ?, ?, ?, ?, ?, ?)', entries)
    print(str(timeit.default_timer() - start_time) + ' seconds pushing genes')
    start_time = timeit.default_timer()
    c.execute('CREATE INDEX gene_name_idx ON genes (gene_name ASC)')
    print(str(timeit.default_timer() - start_time) + ' seconds creating index for genes')
    conn.commit()
    conn.close()


if __name__ == '__main__':
    main()
