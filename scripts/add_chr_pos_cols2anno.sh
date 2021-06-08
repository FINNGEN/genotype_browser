#!/bin/bash

annotated_variants_gz=$1
annotated_variants_added_cols_out=$2

# add chr and pos cols
paste -d'\t' \
<(cat <(echo -e "chr\tpos") <(zcat ${annotated_variants_gz} | cut -f 1 | cut -f 1,2 -d ':' | tr ':' '\t' | tail -n +2))  \
<(zcat ${annotated_variants_gz})  \
| awk 'BEGIN {FS="\t"; OFS="\t"} {print $3, $1, $2, $4, $5, $6, $7, $8, $9, $10, $11}' > ${annotated_variants_added_cols_out}

gzip --force ${annotated_variants_added_cols_out}

