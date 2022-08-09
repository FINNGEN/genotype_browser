from flask import Flask, jsonify, request, abort, render_template
from flask_compress import Compress
import imp, logging
import re

from utils import parse_chr, parse_region, ParseException, NotFoundException
from data import Datafetch
from search import Search
from cloud_storage import CloudStorage

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
    except ParseException as e:
        abort(400, 'could not parse given query to anything useful')
    except NotFoundException as e:
        abort(404, 'not found')
    return jsonify(result)
    
@app.route('/api/v1/variants/<variants>')
def variants(variants):
    try:
        data_type = request.args.get('data_type')       
        data = fetch.get_variants(variants, request.args.to_dict(), data_type)
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

@app.route('/api/v1/clusterplot/<plot_type>/<variant>')
def clusterplot(plot_type, variant):
    try:
        var = re.sub('-', '_', variant)
        arr = var.split('_')
        arr[0] = 'X' if arr[0] == '23' else arr[0] 
        exists_in_chip = fetch.check_var_in_vcf(variant, 'chip')
        filename = config['cluster_plots_location'] + '/' + plot_type + '/' + '_'.join(arr) + '.png'
        if (config['use_gcp_buckets']):
            data = cloud_storage.read_bytes(config['green_bucket'], filename)
            if data is None:
                raise FileNotFoundError("Requested cluster plot not found!")
        else:
            with open(filename, 'rb') as f:
                data = f.read()
        
    except ParseException as e:
        abort(400, 'could not parse given variant')
    except FileNotFoundError as e:
        if exists_in_chip:
            abort(404, 'varaint exists in raw chip but no plot was found')
        else:
            abort(410, 'varaint does not exist in raw chip and no plot was found')
    return data


if __name__ == '__main__':
    app.run()
