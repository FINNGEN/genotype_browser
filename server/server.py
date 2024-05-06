from flask import Flask, jsonify, request, abort, render_template
from flask_compress import Compress
import imp, logging
import re

from utils import parse_chr, parse_region, ParseException, NotFoundException
from data import Datafetch
from search import Search
from cloud_storage import CloudStorage
import pandas as pd
import os

app = Flask(__name__, template_folder='../templates', static_folder='../static')
Compress(app)

config = {}
try:
    _conf_module = imp.load_source('config', 'config.py')
except Exception as e:
    print('Could not load config.py')
    raise
config = {key: getattr(_conf_module, key) for key in dir(_conf_module) if not key.startswith('_')}

gunicorn_logger = logging.getLogger('gunicorn.error')
app.logger.handlers = gunicorn_logger.handlers
app.logger.setLevel(config['log_level'])

cloud_storage = CloudStorage()
fetch = Datafetch(config)
search = Search(config)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def index(path):
    return render_template('index.html')

@app.route('/api/v1/find/<query>')
def find(query):
    try:
        result = search.search(query)
        if result['type'] == 'variant':            
            in_vcf = []
            for v in result['ids']:
                var_in_imputed = int(fetch.vcf_contains_var(v, 'imputed'))
                var_in_chip = int(fetch.vcf_contains_var(v, 'chip'))
                in_vcf.append(var_in_imputed or var_in_chip)
            if sum(in_vcf) == 0:
                raise NotFoundException(query)
    except ParseException as e:
        abort(400, 'could not parse given query to anything useful')
    except NotFoundException as e:
        abort(404, 'not found')
    return jsonify(result)
    
@app.route('/api/v1/variants/<variants>')
def variants(variants):
    try:
        data_type = request.args.get('data_type')
        data_src = fetch.get_var_sources(variants)
        fetch_dtype = data_type
        if data_type == 'imputed':
            # if variant exists in chip but not in imputed
            if not data_src['imputed'] and data_src['chip']:
                fetch_dtype = 'chip'
        else:
            # if variant exists in imputed but not in chip
            if not data_src['chip'] and data_src['imputed']:
                fetch_dtype = 'imputed'
        data = fetch.get_variants(variants, request.args.to_dict(), fetch_dtype)
        data['data_type'] = fetch_dtype
        data['dtype_src'] = data_src
        
    except ParseException as e:
        abort(400, 'could not parse given variant(s)')
    except NotFoundException as e:
        abort(404, 'variant(s) not in data')
    return jsonify(data)

@app.route('/api/v1/gene_variants/<gene>')
def gene_variants(gene):
    try:
        data = fetch.get_gene_variants(gene)
    except ParseException as e:
        abort(400, 'could not parse given gene')
    except NotFoundException as e:
        abort(404, 'gene not in data')
    return jsonify(data)

@app.route('/api/v1/write_variants/<variants>')
def write_variants(variants):
    try:
        data_type = request.args.get('data_type')        
        status = fetch.write_variants(variants, request.args.to_dict(), data_type)
    except ParseException as e:
        abort(400, 'could not parse given variant(s)')
    except NotFoundException as e:
        abort(404, 'variant(s) not in data')
    return status

@app.route('/api/v1/range/<range>')
def range(range):
    try:
        chr, start, end = parse_region(range)
        data = fetch.get_genomic_range_variants(chr, start, end)
    except ParseException as e:
        abort(400, 'could not parse given genomic range')
    except NotFoundException as e:
        abort(404, 'genomic range not in data')
    return jsonify(data)

@app.route('/api/v1/clusterplot/<variant>')
def clusterplot(variant):
    try:
        var = re.sub('-', '_', variant)
        arr = var.split('_')
        arr[0] = 'X' if arr[0] == '23' else arr[0] 
        if arr[0] == '23':
            chrom = 'X'
        elif arr[0] == '24':
            chrom = 'Y'
        elif arr[0] == '26':
            chrom = 'MT'
        else:
            chrom = arr[0]
        arr[0] = chrom
        exists_in_chip = fetch.vcf_contains_var(variant, 'chip')
        filename = config['intensity_files_location'] + '/' + arr[0] + '/' + '_'.join(arr) + '.tsv'
        filename = re.sub('//', '/', filename)
        if (config['use_gcp_buckets']):
            data = cloud_storage.read_bytes(config['red_bucket'], filename)
            if data is None:
                raise FileNotFoundError("Requested cluster plot not found!")
        else:
            with open(filename, 'rb') as f:
                data = f.read()
    except ParseException as e:
        abort(400, 'could not parse given variant')
    except FileNotFoundError as e:
        if exists_in_chip:
            abort(404, 'variant exists in raw chip but no plot was found')
        else:
            return {}
    return data

@app.route('/api/v1/qc/<varaints>')
def qc(varaints):
    try:
        result = fetch.get_qc_varaints(varaints)
    except Exception as e:
        abort(404)
    return jsonify(result)

if __name__ == '__main__':
    app.run()
