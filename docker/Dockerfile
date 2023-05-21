# FROM ubuntu:18.04
FROM debian:11

ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8

WORKDIR /tmp

RUN apt-get update -y && apt-get upgrade -y

# htslib (for tabix) requires zlib, bz2, lzma # zlib1g-dev libbz2-dev liblzma-dev
RUN apt-get install curl python3-pip wget -y


# add node archive
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install nodejs -y

# install pysam using conda
ENV PATH="/miniconda3/bin:${PATH}"
ARG PATH="/miniconda3/bin:${PATH}"

RUN wget \
    https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh \
    && bash Miniconda3-latest-Linux-x86_64.sh -p /miniconda3 -b \
    && rm -f Miniconda3-latest-Linux-x86_64.sh

RUN conda config --add channels defaults
RUN conda config --add channels conda-forge
RUN conda config --add channels bioconda
RUN conda install pysam=0.19.1

ADD . /opt/genotype_browser
RUN /miniconda3/bin/pip3 install -r /opt/genotype_browser/requirements.txt

RUN cd /opt/genotype_browser/react && npm ci && node_modules/webpack/bin/webpack.js --config webpack.prod.js

EXPOSE 8080
CMD cd /config && /opt/genotype_browser/server/run.py
