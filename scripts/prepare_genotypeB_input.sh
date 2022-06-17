#!/bin/bash
usage()
{
cat << EOF

This script prepares the sqlite db for genotype browser.
It accepts the following inputs from a text file supplied as an argument to the script, with the paths being either gcs bucket addresses or local paths.
The inputs inside square brackets are optional with their defaults shown.

OPTIONS: 

   [OUTPUT_PATH] :	defaults to '$HOME/GB_out'
   [GENE_ANNOTATION_REFERENCE_FILE_GTF] :	default is v38 which is downloaded from http://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_38/gencode.v38.annotation.gtf.gz
   RELEASE_PREFIX :	should start with r or R and then the release number e.g. r9 or R9
   FGFACTORY_PASS_SAMPLES:	colon-separated file containing FinnGen factory pass samples and additional informatioon on the batch, cohort, number of variants, etc. ,found in red library
   FINNGEN_ENDPOINT :	FinnGen endpoints,found in red library
   FINNGEN_MINIMUM_DATA :	FinnGen minimum phenotype data,found in red library
   FINNGEN_COHORT_DATA :	tab-separated FinnGen cohort file with two columns,found in red library
   IMPU_RELEASE_VARIANT_ANNOTATION_FILE :    variant annotation file prepared by analysis team for imputed data
   CHIP_RELEASE_VARIANT_ANNOTATION_FILE :    variant annotation file prepared by analysis team for chip data
   
exiting...
EOF
exit 1
}


beginswith() 
{ 
case $2 in 
"$1"*) true;; 
*) false;; 
esac 
}

declare -fx beginswith # to list the function(-f) and export it outside this env't(-x)to be used for instance in get_chip_from_anno.sh

set -euo pipefail

printf  "`date`\t prepare_genotypeB_input\n\n"

START=$(date "+%s")

#using the mapfile array to hold inputs (leaving out the comments and empty lines)
mapfile -t < <(grep -v "^#\|^[[:blank:]]*$" $1)

for ARGUMENT in "${MAPFILE[@]}"
do
   KEY=$(echo $ARGUMENT | cut -f1 -d=)
   VALUE=${ARGUMENT#*=}
   export "$KEY"="$VALUE"
done

OUTPUT_PATH=${OUTPUT_PATH:-"$HOME/GB_out"}
mkdir -p "$OUTPUT_PATH"

[ -z $GENE_ANNOTATION_REFERENCE_FILE_GTF ] && wget http://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_38/gencode.v38.annotation.gtf.gz -q -O ${OUTPUT_PATH}/gencode.v38.annotation.gtf.gz && GENE_ANNOTATION_REFERENCE_FILE_GTF=${OUTPUT_PATH}/gencode.v38.annotation.gtf.gz

[[ ! $RELEASE_PREFIX =~ ^[rR][0-9]+$ ]] && echo "--- Arg RELEASE_PREFIX missing OR not in the correct format ---" && usage
[ -z $FGFACTORY_PASS_SAMPLES ] && echo "--- Arg FGFACTORY_PASS_SAMPLES missing ---" && usage
[ -z $FINNGEN_ENDPOINT ] && echo "--- Arg FINNGEN_ENDPOINT missing ---" && usage
[ -z $FINNGEN_MINIMUM_DATA ] && echo "--- Arg FINNGEN_MINIMUM_DATA missing ---" && usage
[ -z $FINNGEN_COHORT_DATA ] && echo "--- Arg FINNGEN_COHORT_DATA missing ---" && usage
[ -z $IMPU_RELEASE_VARIANT_ANNOTATION_FILE ] && echo "--- Arg IMPU_RELEASE_VARIANT_ANNOTATION_FILE missing ---" && usage
[ -z $CHIP_RELEASE_VARIANT_ANNOTATION_FILE ] && echo "--- Arg CHIP_RELEASE_VARIANT_ANNOTATION_FILE missing ---" && usage

echo "Extracting SAMPLE_LIST from FGFACTRORY_PASS_SAMPLES"

if beginswith gs: "$FGFACTORY_PASS_SAMPLES"; then 
	gsutil cat "$FGFACTORY_PASS_SAMPLES" | zcat -f | tail -n +2 | cut -d ":" -f 6 >"${OUTPUT_PATH}/SAMPLE_LIST_${RELEASE_PREFIX}.txt"
else
        zcat -f "$FGFACTORY_PASS_SAMPLES" | tail -n +2 | cut -d ":" -f 6 >"${OUTPUT_PATH}/SAMPLE_LIST_${RELEASE_PREFIX}.txt"
fi

echo "Extracting death from endpoint"

if beginswith gs: "$FINNGEN_ENDPOINT"; then
	gsutil cat "$FINNGEN_ENDPOINT" | zcat -f | cut -f 1-10 >"${OUTPUT_PATH}/FINNGEN_ENDPOINT_DEATH_EXTRACTED_${RELEASE_PREFIX}.txt"
else
	zcat -f "$FINNGEN_ENDPOINT" |  cut -f 1-10 >"${OUTPUT_PATH}/FINNGEN_ENDPOINT_DEATH_EXTRACTED_${RELEASE_PREFIX}.txt"
fi

echo "STEP 1: Prepare basic info phenotype file"
#the paths can be gcs paths as long as pandas version >=0.24 is used and pip install gcsfs
# make sure you are in the scripts directory or give the full path of the scripts

python3 merge_basic_info.py -s "${OUTPUT_PATH}/SAMPLE_LIST_${RELEASE_PREFIX}.txt" -d "${OUTPUT_PATH}/FINNGEN_ENDPOINT_DEATH_EXTRACTED_${RELEASE_PREFIX}.txt" \
-m "$FINNGEN_MINIMUM_DATA" -c "$FINNGEN_COHORT_DATA" -a "$FGFACTORY_PASS_SAMPLES" -o "${OUTPUT_PATH}/BASIC_INFO_PHENOTYPE_FILE_${RELEASE_PREFIX}.txt"

echo "STEP 2. Prepare chips"

bash get_chip_from_anno.sh "$IMPU_RELEASE_VARIANT_ANNOTATION_FILE" "${OUTPUT_PATH}/CHIPVARS_FILE_${RELEASE_PREFIX}.txt.gz"

echo "STEP 3. Prepare gene annotation table"

python3 prepare_gene_ann.py -a "$GENE_ANNOTATION_REFERENCE_FILE_GTF" -o "${OUTPUT_PATH}/GENE_ANNOTATION_FILE.csv"

echo "STEP 4. Prepare combined variant annotation file"

python3 combine_imputed_and_rawchip_vars.py \
-c "$CHIP_RELEASE_VARIANT_ANNOTATION_FILE" \
-i "$IMPU_RELEASE_VARIANT_ANNOTATION_FILE" \
-o "${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv"

gzip "${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv"


echo "STEP 5. Populate variant annotation database"

python3 populate_sqlite.py \
--variant_annotation_file "${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv.gz" \
--variant_chip_file "${OUTPUT_PATH}/CHIPVARS_FILE_${RELEASE_PREFIX}.txt.gz" \
--genes_anno_file "${OUTPUT_PATH}/GENE_ANNOTATION_FILE.csv" \
--sqlite_db ${OUTPUT_PATH}/fgq.${RELEASE_PREFIX#,,}.1.db

FINISH=$(date "+%s")
ELAPSED_SEC=$((FINISH - START))
echo >&2 "Elapsed time for $(basename "$0") ${ELAPSED_SEC} s"
