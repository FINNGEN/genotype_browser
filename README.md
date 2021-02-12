# genotype_browser
FinnGen genotype browser pilot

### Running Docker image

Get dummy data, annotation db and configuration file, e.g.

```
mkdir data && cd data
gsutil -mq cp gs://to_solita/genotype_50k/vcf/* .
gsutil -mq cp gs://to_solita/genotype_20k_chip/vcf/* .
gsutil -mq cp gs://to_solita/genotype_browser/1/fgq.r6.4.db . 
gsutil -mq cp gs://to_solita/genotype_browser/1/genotype_browser_dummy_data_50k_1.txt.gz . 
curl https://raw.githubusercontent.com/FINNGEN/genotype_browser/main/config/config.py.dummy -o config.py
```

Run container from the above directory

```
docker run -it -p 0.0.0.0:8080:8080/tcp -v `pwd`:/config finngen/genotype_browser:6373448
```

### Development

Python 3.6+, npm and dummy data required

First install htslib (tabix), see [Dockerfile](docker/Dockerfile) or [http://www.htslib.org/download](http://www.htslib.org/download)

Install and run the server, e.g.:

```
git clone https://github.com/FINNGEN/genotype_browser
cd genotype_browser
pip3 install -r requirements.txt
cp config/config.py.dummy config.py
# modify config.py to point to the data and
server/run.py # will run in port 8080 by default, reading config.py from the current directory
```

Create js bundle

```
cd react
npm ci
./dev.sh # will watch js files as they change and create static/bundle.js
```
