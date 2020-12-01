#!/usr/bin/env python3

import imp, sqlite3, timeit, gzip

def populate_anno(config):
    start_time = timeit.default_timer()
    conn = sqlite3.connect(config['sqlite_db'])
    c = conn.cursor()
    c.execute('DROP TABLE IF EXISTS anno')
    c.execute('CREATE TABLE anno (variant text, rsid text, af real, info real, enrichment_nfsee_genomes real, enrichment_nfsee_exomes real, gene_most_severe text, most_severe text, consequence_gnomad text)')
    entries = []
    with gzip.open(config['variant_annotation_file'], 'rt') as f:
        h = {h:i for i,h in enumerate(f.readline().strip().split('\t'))}
        for line in f:
            s = line.strip().split('\t')
            #TODO gets the first rsid.. whats the best rsid
            entries.append((s[h['#variant']], s[h['rsids']].split(',')[0], s[h['AF']], s[h['INFO']], s[h['enrichment_nfsee_genomes']], s[h['enrichment_nfsee_exomes']], s[h['gene_most_severe']], s[h['most_severe']], s[h['consequence_gnomad']]))
    c.executemany('INSERT INTO anno VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', entries)
    print(str(timeit.default_timer() - start_time) + ' seconds pushing anno')
    start_time = timeit.default_timer()
    c.execute('CREATE INDEX variant_idx ON anno (variant ASC)')
    c.execute('CREATE INDEX gene_idx ON anno (gene_most_severe ASC)')
    c.execute('CREATE INDEX rsid_idx ON anno (rsid ASC)')
    print(str(timeit.default_timer() - start_time) + ' seconds creating index')
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
    print(str(timeit.default_timer() - start_time) + ' seconds creating index')
    conn.commit()
    conn.close()

if __name__ == '__main__':
    try:
        _conf_module = imp.load_source('config', 'config_createdb.py')
    except Exception as e:
        print('Could not load config_createdb.py')
        raise
    config = {key: getattr(_conf_module, key) for key in dir(_conf_module) if not key.startswith('_')}
    populate_anno(config)
    populate_chip(config)
