FROM ubuntu:20.04

ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8

ARG HTSLIB_VER=1.10.2

WORKDIR /tmp

RUN apt-get update -y && apt-get upgrade -y

# htslib (for tabix) requires zlib, bz2, lzma
RUN apt-get install curl python3-pip zlib1g-dev libbz2-dev liblzma-dev -y

# add node archive
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install nodejs -y

RUN curl -LO https://github.com/samtools/htslib/releases/download/${HTSLIB_VER}/htslib-${HTSLIB_VER}.tar.bz2 && \
    tar -xvjf htslib-${HTSLIB_VER}.tar.bz2 && cd htslib-${HTSLIB_VER} && \
    ./configure && make && make install && cd .. && rm -rf htslib-${HTSLIB_VER}*

ADD . /opt/genotype_browser
RUN pip3 install -r /opt/genotype_browser/requirements.txt

RUN cd /opt/genotype_browser/react && npm ci && node_modules/webpack/bin/webpack.js --config webpack.prod.js

EXPOSE 8080
CMD cd /config && /opt/genotype_browser/server/run.py
