from flask import Flask, jsonify, request, abort, render_template
from flask_compress import Compress
import imp, logging

from utils import parse_chr, ParseException, NotFoundException
from data import Datafetch
from search import Search

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
    #print(request.args.to_dict())
    try:
        data = fetch.get_variants(variants, request.args.to_dict())
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
        status = fetch.write_variants(variants, request.args.to_dict())
    except ParseException as e:
        abort(400, 'could not parse given variant(s)')
    except NotFoundException as e:
        abort(404, 'variant(s) not in data')
    return jsonify(status)

@app.route('/api/v1/range/<range>')
def range(range):
    try:
        data = fetch.get_genomic_range_variants(range)
    except ParseException as e:
        abort(400, 'could not parse given genomic range')
    except NotFoundException as e:
        abort(404, 'genomic range not in data')
    return jsonify(data)

if __name__ == '__main__':
    app.run()
