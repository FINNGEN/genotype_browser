#!/bin/bash

annotated_variants_gz=$1 	# e.g. /mnt/nfs/r6/annotations/R6_annotated_variants_v1.gz
output_chipvars_gz=$2 		# e.g. /mnt/nfs/r6/annotations/R6_chipvars.txt.gz

time zcat ${annotated_variants_gz} | \
    awk 'BEGIN{OFS="\t"} NR==1{for (i=1;i<=NF;i++) if ($i ~ "^CHIP_") {sub("CHIP_", "", $i); a[i]=$i}} NR>1{for (i in a) if ($i==1) print $1,a[i]}' \
    | bgzip -@4 > ${output_chipvars_gz}
