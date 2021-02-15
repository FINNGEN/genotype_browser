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

    def _get_variant(self, chr, pos, ref, alt, data_type):
        in_data = 1 if data_type == 'imputed' else 2
        c = self.conn[threading.get_ident()].cursor()        
        q = 'SELECT variant FROM anno WHERE variant = "%s" AND (in_data=%s OR in_data=3);' % (str(chr) + ':' + str(pos) + ':' + ref + ':' + alt, in_data)        
        c.execute(q)
        # c.execute('SELECT variant FROM %s WHERE variant = ?' % db, [str(chr) + ':' + str(pos) + ':' + ref + ':' + alt])
        res = c.fetchall()
        if len(res) > 0:
            return res[0][0]
        else:
            raise utils.NotFoundException(str(chr) + '-' + str(pos) + '-' + ref + '-' + alt)
        
    def _get_variants_by_rsid(self, rsid, data_type):
        in_data = 1 if data_type == 'imputed' else 2
        c = self.conn[threading.get_ident()].cursor()
        q = 'SELECT variant FROM anno WHERE rsid = "%s" AND (in_data=%s OR in_data=3);' % (rsid.lower(), in_data)        
        c.execute(q)
        res = c.fetchall()
        if len(res) > 0:
            return [r[0] for r in res]
        else:
            raise utils.NotFoundException(rsid)

    def _get_variants_in_range(self, chr, start, end, data_type):
        in_data = 1 if data_type == 'imputed' else 2
        c = self.conn[threading.get_ident()].cursor()
        q = 'SELECT variant FROM anno WHERE chr="%s" AND pos>=%s AND pos<=%s AND (in_data=%s OR in_data=3) LIMIT 1;' % (chr, start, end, in_data)        
        c.execute(q)
        res = c.fetchall()
        res_formatted = []
        if len(res) > 0:
            for tup in res:
                res_formatted.append(str(tup).replace("('", "").replace("',)", ""))
        if len(res_formatted) > 0:
            return res_formatted
        else:
            raise utils.NotFoundException(str(chr) + ':' + str(start) + '-' + str(end))

    def _search_gene(self, query, data_type):
        c = self.conn[threading.get_ident()].cursor()
        c.execute('SELECT * FROM genes WHERE gene_name = ? LIMIT 1', [query])
        res_gene = c.fetchall()
        if len(res_gene) > 0:
            gene = res_gene[0]
        else:
            raise utils.NotFoundException(query)
        try:
            res = self._get_variants_in_range(gene[0], gene[1], gene[2], data_type)
        except utils.NotFoundException as e:
            raise utils.NotFoundException(query)
        else:
            return query
        return res
    
    def _search_variants(self, query, data_type):
        var_ids = []
        try:
            for q in query.split(','):
                if q.lower().startswith('rs'):
                    vars = self._get_variants_by_rsid(q, data_type)
                    var_ids.extend(['-'.join([str(s) for s in var.split(':')]) for var in vars])
                else:
                    chr, pos, ref, alt = utils.parse_variant(q)
                    self._get_variant(chr, pos, ref, alt, data_type)
                    var_ids.extend(['-'.join([str(s) for s in [chr, pos, ref, alt]])])
        except utils.ParseException as e:
            pass
        except utils.NotFoundException as e:
            pass
        if len(var_ids) > 0:
            return var_ids
        else:
            raise utils.NotFoundException(query)

    def _search_range(self, query, data_type):
        var_ids = []
        try:
            chr, start, end = utils.parse_region(query)
            vars = self._get_variants_in_range(chr, start, end, data_type)
            var_ids.extend(['-'.join([str(s) for s in var.split(':')]) for var in vars])
        except utils.ParseException as e:
            pass
        except utils.NotFoundException as e:
            pass
        except ValueError as e:
            pass
        if len(var_ids) > 0:
            return var_ids
        else:
            raise utils.NotFoundException(query)
        
    def search(self, query, data_type):
        try:
            var_ids = self._search_variants(query, data_type)
            return {
                'query': query,
                'type': 'variant',
                'ids': var_ids
            }
        except utils.NotFoundException as e:
            pass
        try:
            gene = self._search_gene(query, data_type)
            return {
                'query': query,
                'type': 'gene',
                'ids': [gene]
            }
        except utils.NotFoundException as e:
            pass
        try:
            var_ids = self._search_range(query, data_type)
            return {
                'query': query,
                'type': 'range',
                'ids': var_ids
            }
        except utils.NotFoundException as e:
            raise