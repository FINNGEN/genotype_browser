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
   FINNGEN_MINIMUM_COHORT_DATA :	FinnGen minimum phenotype data also containing cohort columns starting from df11,found in red library
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

OUTPUT_PATH=${OUTPUT_PATH:-"$HOME/GB_out_$RELEASE_PREFIX"}
mkdir -p "$OUTPUT_PATH"

[ -z $GENE_ANNOTATION_REFERENCE_FILE_GTF ] && wget http://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_38/gencode.v38.annotation.gtf.gz -q -O ${OUTPUT_PATH}/gencode.v38.annotation.gtf.gz && GENE_ANNOTATION_REFERENCE_FILE_GTF=${OUTPUT_PATH}/gencode.v38.annotation.gtf.gz

[[ ! $RELEASE_PREFIX =~ ^[rR][0-9]+$ ]] && echo "--- Arg RELEASE_PREFIX missing OR not in the correct format ---" && usage
[ -z $FGFACTORY_PASS_SAMPLES ] && echo "--- Arg FGFACTORY_PASS_SAMPLES missing ---" && usage
[ -z $FINNGEN_ENDPOINT ] && echo "--- Arg FINNGEN_ENDPOINT missing ---" && usage
[ -z $FINNGEN_MINIMUM_COHORT_DATA ] && echo "--- Arg FINNGEN_MINIMUM_COHORT_DATA missing ---" && usage
[ -z $IMPU_RELEASE_VARIANT_ANNOTATION_FILE ] && echo "--- Arg IMPU_RELEASE_VARIANT_ANNOTATION_FILE missing ---" && usage
[ -z $CHIP_RELEASE_VARIANT_ANNOTATION_FILE ] && echo "--- Arg CHIP_RELEASE_VARIANT_ANNOTATION_FILE missing ---" && usage

echo "Extracting SAMPLE_LIST from FGFACTRORY_PASS_SAMPLES"


if [ ! -f "${OUTPUT_PATH}/SAMPLE_LIST_${RELEASE_PREFIX}.txt" ]; then
   echo -e "File ${OUTPUT_PATH}/SAMPLE_LIST_${RELEASE_PREFIX}.txt does not exist - create\n";
   if beginswith gs: "$FGFACTORY_PASS_SAMPLES"; then 
      gsutil cat "$FGFACTORY_PASS_SAMPLES" | zcat -f | tail -n +2 | cut -d ":" -f 6 >"${OUTPUT_PATH}/SAMPLE_LIST_${RELEASE_PREFIX}.txt";
   else
      zcat -f "$FGFACTORY_PASS_SAMPLES" | tail -n +2 | cut -d ":" -f 6 >"${OUTPUT_PATH}/SAMPLE_LIST_${RELEASE_PREFIX}.txt"
   fi
fi


echo "Extracting death from endpoint"

if [ ! -f "${OUTPUT_PATH}/FINNGEN_ENDPOINT_DEATH_EXTRACTED_${RELEASE_PREFIX}.txt" ]; then
   echo -e "File ${OUTPUT_PATH}/FINNGEN_ENDPOINT_DEATH_EXTRACTED_${RELEASE_PREFIX}.txt does not exist - create\n";
   if beginswith gs: "$FINNGEN_ENDPOINT"; then
      gsutil cat "$FINNGEN_ENDPOINT" | zcat -f | cut -f 1-10 >"${OUTPUT_PATH}/FINNGEN_ENDPOINT_DEATH_EXTRACTED_${RELEASE_PREFIX}.txt";
   else
      zcat -f "$FINNGEN_ENDPOINT" |  cut -f 1-10 >"${OUTPUT_PATH}/FINNGEN_ENDPOINT_DEATH_EXTRACTED_${RELEASE_PREFIX}.txt"
   fi
fi

echo "STEP 1: Prepare basic info phenotype file"
#the paths can be gcs paths as long as pandas version >=0.24 is used and pip install gcsfs
# make sure you are in the scripts directory or give the full path of the scripts


if [ -f "${OUTPUT_PATH}/BASIC_INFO_PHENOTYPE_FILE_${RELEASE_PREFIX}.txt" ]; then
   echo -e "File ${OUTPUT_PATH}/BASIC_INFO_PHENOTYPE_FILE_${RELEASE_PREFIX}.txt exists - skip\n";
else
   python3 merge_basic_info.py -s "${OUTPUT_PATH}/SAMPLE_LIST_${RELEASE_PREFIX}.txt" -d "${OUTPUT_PATH}/FINNGEN_ENDPOINT_DEATH_EXTRACTED_${RELEASE_PREFIX}.txt" \
   -m "$FINNGEN_MINIMUM_COHORT_DATA" -a "$FGFACTORY_PASS_SAMPLES" -o "${OUTPUT_PATH}/BASIC_INFO_PHENOTYPE_FILE_${RELEASE_PREFIX}.txt"
fi


echo "STEP 2. Prepare chips"

if [ -f "${OUTPUT_PATH}/CHIPVARS_FILE_${RELEASE_PREFIX}.txt.gz" ]; then
   echo -e "File ${OUTPUT_PATH}/CHIPVARS_FILE_${RELEASE_PREFIX}.txt.gz exists - skip\n";
else
   bash get_chip_from_anno.sh "$IMPU_RELEASE_VARIANT_ANNOTATION_FILE" "${OUTPUT_PATH}/CHIPVARS_FILE_${RELEASE_PREFIX}.txt.gz"
fi

echo "STEP 3. Prepare gene annotation table"


if [ -f "${OUTPUT_PATH}/GENE_ANNOTATION_FILE.csv" ]; then
   echo -e "File ${OUTPUT_PATH}/GENE_ANNOTATION_FILE.csv exists - skip\n";
else
   python3 prepare_gene_ann.py -a "$GENE_ANNOTATION_REFERENCE_FILE_GTF" -o "${OUTPUT_PATH}/GENE_ANNOTATION_FILE.csv"
fi


echo "STEP 4. Prepare combined variant annotation file"

if [ ! -f "${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv.gz" ]; then
   
   echo -e "File ${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv.gz does not exist - create\n";
   
   if [ ! -f "${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv" ]; then 
      echo -e "File ${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv exists - skip\n";
      python3 combine_imputed_and_rawchip_vars.py \
         -c "$CHIP_RELEASE_VARIANT_ANNOTATION_FILE" \
         -i "$IMPU_RELEASE_VARIANT_ANNOTATION_FILE" \
         -o "${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv"
      gzip -f "${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv" 
   fi

fi


echo "STEP 5. Populate variant annotation database"

if [ -f "${OUTPUT_PATH}/fgq.${RELEASE_PREFIX#,,}.1.db" ]; then
    echo -e "File ${OUTPUT_PATH}/fgq.${RELEASE_PREFIX#,,}.1.db exists - skip\n";
else  
   python3 populate_sqlite.py \
   --variant_annotation_file "${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv.gz" \
   --variant_chip_file "${OUTPUT_PATH}/CHIPVARS_FILE_${RELEASE_PREFIX}.txt.gz" \
   --genes_anno_file "${OUTPUT_PATH}/GENE_ANNOTATION_FILE.csv" \
   --sqlite_db ${OUTPUT_PATH}/fgq.${RELEASE_PREFIX#,,}.1.db
fi


echo "Random sampling of variants for testing at STEP 6"

# get 20(this value can be changed) random variants for testing in STEP 6
# from the "${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv"

time zcat "${OUTPUT_PATH}/VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_${RELEASE_PREFIX}.csv" | \
   awk 'BEGIN{srand();k=20} NR==1 {next} {i = int(NR * rand()) } i < k { a[i] = $1 }END {for (i in a) {print a[i];}}' \
   > "${OUTPUT_PATH}/random_impvariant_sample.txt"

echo "STEP 6. Test the genotypes in the genotype browser are the same as those we get from the vcfs"
echo "IF the test fails, please inform the genotypebrowser developers."
echo "Please also attach the test result file that is saved in the output directory you specified as test_result_<date>.txt"

# populate config template with recently created files
cp config.template.py config.testing.py
DB=${OUTPUT_PATH}/fgq.${RELEASE_PREFIX#,,}.1.db
BASIC_INFO_PHENOTYPE_FILE="${OUTPUT_PATH}/BASIC_INFO_PHENOTYPE_FILE_${RELEASE_PREFIX}.txt"
sed -i "s|#DB#|$DB|g" config.testing.py 
sed -i "s|#BASIC_INFO_PHENOTYPE_FILE#|$BASIC_INFO_PHENOTYPE_FILE|g" config.testing.py 

if beginswith gs: "$GEOJSON"; then 
   gsutil cp "$GEOJSON" ${OUTPUT_PATH}/ ;
   GEOJSON_LOC="${OUTPUT_PATH}/$(basename $GEOJSON)"
else
   GEOJSON_LOC=$GEOJSON
fi
sed -i "s|#GEOJSON#|$GEOJSON_LOC|g" config.testing.py 

VCF_FILES_IMUTED=()
VCF_FILES_CHIP=()
for chr in $(seq 1 23); do 
   vcf_imput=$(echo -e \"$IMPU_RELEASE_VCF_CHR\"| sed -e "s|#CHR#|$chr|g");
   vcf_chip=$(echo -e \"$CHIP_RELEASE_VCF_CHR\"| sed -e "s|#CHR#|$chr|g");
   VCF_FILES_IMUTED+=($vcf_imput)
   VCF_FILES_CHIP+=($vcf_chip)
done

# join into string and populate config template
IFS=, eval 'JOINED_IMPUTED="${VCF_FILES_IMUTED[*]}"'
IFS=, eval 'JOINED_CHIP="${VCF_FILES_CHIP[*]}"'
sed -i "s|#IMPU_RELEASE_VCFS#|$JOINED_IMPUTED|g" config.testing.py
sed -i "s|#CHIP_RELEASE_VCFS#|$JOINED_CHIP|g" config.testing.py 

# copy configs to the output folder
echo "Finished creating test config.testing.py file for running integration test"

# arrays of the possible filters to randomly choose from
data_type=("imputed" "chip" "both")
alive=("all" "alive" "dead")
sex=("all" "female" "male")
array=("all" "finngen" "legacy")
impchip=("all" "imp" "chip")
gtgp=("gt" "gp")
gpThres=("0.95")
het=("true" "false")
hom=("true" "false")
wt_hom=("true" "false")
missing=("false") # missing 'true' is removed because it causes discrepancy with the genotypes in the vcf

printf '%.0s*' $(seq $(tput cols)) | tee -a "${OUTPUT_PATH}/test_result_$(date +"%F").txt"

printf '\n\n'

while read -r line; do
  v="${line//:/-}"

  # random sampling from the arrays using the $RANDOM function and the size of the arrays
  data_type_rs=${data_type[(($RANDOM % 3))]}
  alive_rs=${alive[(($RANDOM % 3))]}
  sex_rs=${sex[(($RANDOM % 3))]}
  array_rs=${array[(($RANDOM % 3))]}
  impchip_rs=${impchip[(($RANDOM % 3))]}
  gtgp_rs=${gtgp[(($RANDOM % 2))]}
  gpThres_rs=${gpThres[(($RANDOM % 1))]}
  het_rs=${het[(($RANDOM % 2))]}
  hom_rs=${hom[(($RANDOM % 2))]}
  wt_hom_rs=${wt_hom[(($RANDOM % 2))]}
  missing_rs=${missing[(($RANDOM % 1))]}

  echo "Testing variant: ${line}" | tee -a "${OUTPUT_PATH}/test_result_$(date +"%F").txt"

  f='{"alive": "'"$alive_rs"'", "sex": "'"$sex_rs"'", "array": "'"$array_rs"'", "impchip": "'"$impchip_rs"'",
      "gtgp": "'"$gtgp_rs"'", "gpThres": "'"$gpThres_rs"'", "het": "'"$het_rs"'", "hom": "'"$hom_rs"'", "wt_hom": "'"$wt_hom_rs"'",
      "missing": "'"$missing_rs"'", "data_type": "'"$data_type_rs"'"}'

  echo "The filters are :$f" | tee -a "${OUTPUT_PATH}/test_result_$(date +"%F").txt"

  python3 ../server/gt_test.py -v "$v" -d "$data_type_rs" -f "$f" 2>&1| tee -a "${OUTPUT_PATH}/test_result_$(date +"%F").txt"

  printf '%.0s*' $(seq $(tput cols)) | tee -a "${OUTPUT_PATH}/test_result_$(date +"%F").txt"

  printf '\n\n'

done < "${OUTPUT_PATH}/random_impvariant_sample.txt"

mv config.testing.py ${OUTPUT_PATH}/
echo "Finished testing, used config file is available under ${OUTPUT_PATH}/ output folder"

FINISH=$(date "+%s")
ELAPSED_SEC=$((FINISH - START))
echo >&2 "Elapsed time for $(basename "$0") ${ELAPSED_SEC} s"
