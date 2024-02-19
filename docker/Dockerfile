FROM ubuntu:20.04

ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8

ARG HTSLIB_VER=1.17
ARG NODE_MAJOR=20

WORKDIR /tmp

RUN apt-get update -y && apt-get upgrade -y

# htslib (for tabix) requires zlib, bz2, lzma
RUN apt-get install curl python3-pip zlib1g-dev libbz2-dev liblzma-dev libcurl4-openssl-dev -y

RUN apt-get update; \
    apt-get install -y ca-certificates curl gnupg; \
    mkdir -p /etc/apt/keyrings; \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
     | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg; \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" \
     > /etc/apt/sources.list.d/nodesource.list; \
    apt-get -qy update; \
    apt-get -qy install nodejs;

RUN curl -LO https://github.com/samtools/htslib/releases/download/${HTSLIB_VER}/htslib-${HTSLIB_VER}.tar.bz2 && \
    tar -xvjf htslib-${HTSLIB_VER}.tar.bz2 && cd htslib-${HTSLIB_VER} && \
    ./configure && make && make install && cd .. && rm -rf htslib-${HTSLIB_VER}*

ADD . /opt/genotype_browser
RUN pip3 install -r /opt/genotype_browser/requirements.txt

RUN cd /opt/genotype_browser/react && npm ci && node_modules/webpack/bin/webpack.js --config webpack.prod.js

EXPOSE 8080
CMD cd /config && /opt/genotype_browser/server/run.py
