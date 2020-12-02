import gzip, pysam, threading, logging, timeit, os, sqlite3
import pandas as pd
import numpy as np
from collections import defaultdict

import utils

class Search(object):

    def _init_db(self):
        self.conn = defaultdict(lambda: sqlite3.connect(self.conf['sqlite_db']))
    
    def __init__(self, conf):
        self.conf=conf
        self._init_db()

    def _get_variant(self, chr, pos, ref, alt):
        c = self.conn[threading.get_ident()].cursor()
        c.execute('SELECT variant FROM anno WHERE variant = ?', [str(chr) + ':' + str(pos) + ':' + ref + ':' + alt])
        res = c.fetchall()
        if len(res) > 0:
            return res[0][0]
        else:
            raise utils.NotFoundException(str(chr) + '-' + str(pos) + '-' + ref + '-' + alt)
        
    def _get_variants_by_rsid(self, rsid):
        c = self.conn[threading.get_ident()].cursor()
        c.execute('SELECT variant FROM anno WHERE rsid = ?', [rsid.lower()])
        res = c.fetchall()
        if len(res) > 0:
            return [r[0] for r in res]
        else:
            raise utils.NotFoundException(rsid)

    def _search_gene(self, query):
        c = self.conn[threading.get_ident()].cursor()
        c.execute('SELECT gene_most_severe FROM anno WHERE gene_most_severe = ? COLLATE NOCASE LIMIT 1', [query])
        res = c.fetchall()
        if len(res) > 0:
            return res[0][0]
        else:
            raise utils.NotFoundException(query)
    
    def _search_variants(self, query):
        var_ids = []
        try:
            for q in query.split(','):
                if q.lower().startswith('rs'):
                    vars = self._get_variants_by_rsid(q)
                    var_ids.extend(['-'.join([str(s) for s in var.split(':')]) for var in vars])
                else:
                    chr, pos, ref, alt = utils.parse_variant(q)
                    self._get_variant(chr, pos, ref, alt)
                    var_ids.extend(['-'.join([str(s) for s in [chr, pos, ref, alt]])])
        except utils.ParseException as e:
            pass
        except utils.NotFoundException as e:
            pass
        if len(var_ids) > 0:
            return var_ids
        else:
            raise utils.NotFoundException(query)
    
    def search(self, query):
        try:
            var_ids = self._search_variants(query)
            return {
                'query': query,
                'type': 'variant',
                'ids': var_ids
            }
        except utils.NotFoundException as e:
            pass
        try:
            gene = self._search_gene(query)
            return {
                'query': query,
                'type': 'gene',
                'ids': [gene]
            }
        except utils.NotFoundException as e:
            raise
