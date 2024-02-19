#!/bin/bash
annotated_variants_gz=$1 	# e.g. /mnt/nfs/r6/annotations/R6_annotated_variants_v1.gz
output_chipvars_gz=$2 		# e.g. /mnt/nfs/r6/annotations/R6_chipvars.txt.gz
if beginswith gs: "$annotated_variants_gz"; then
	time gsutil cat "$annotated_variants_gz" | zcat -f | \
    	awk 'BEGIN{FS=OFS="\t"} NR==1{ for (i=1;i<=NF;i++) if ($i ~ "^CHIP_") { split($i, s1, "."); split(s1[1], s2, "_chr"); h=s2[1]; sub("CHIP_", "", h); a[i]=h}} NR>1{ for (i in a) if ($i==1) print $1,a[i]}'  \
    	| bgzip -@4 > ${output_chipvars_gz}
else
	time zcat -f  "$annotated_variants_gz" | \
        awk 'BEGIN{FS=OFS="\t"} NR==1{ for (i=1;i<=NF;i++) if ($i ~ "^CHIP_") { split($i, s1, "."); split(s1[1], s2, "_chr"); h=s2[1]; sub("CHIP_", "", h); a[i]=h}} NR>1{ for (i in a) if ($i==1) print $1,a[i]}' \
        | bgzip -@4 > ${output_chipvars_gz}
fi
