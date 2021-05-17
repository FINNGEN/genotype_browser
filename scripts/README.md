# DATA PREPARATION FOR THE GENOTYPE BROWSER

## Requirements:
- tabix package: `apt-get update && apt-get install tabix`

## STEP 1: Prepare basic info phenotype file

Basic info phenotype file contains basic phenotype information on the samples which includes information on e.g. cohort and batch in which sample belongs to, chip tecjnology used to genotype the sample, individual's gender, etc. This informationn is combined based on multiple files which can mostly be found in the library-red bucket or were produced by the fgfactory and analysis team's pipeline. In order to prepare basic info phenotype file for the genotype browser running on FinnGen data, run the following script:

```
python3 merge_basic_info.py \
SAMPLE_LIST \
FINNGEN_ENDPOINT_DEATH_EXTRACTED \
FINNGEN_MINIMUM_DATA \
FINNGEN_COHORT_DATA \
FGFACTORY_PASS_SAMPLES \
BASIC_INFO_PHENOTYPE_FILE
```

### Parameters description

**Inputs**: 
- _SAMPLE_LIST_: file without header containing sample IDs in a single column;
- _FINNGEN_ENDPOINT_DEATH_EXTRACTED_: tab-separated file with extracted death-endpoint columns from the FinnGen endpoints conntaining the following columns: 
	- _FINNGENID_: study ID;
	- _DEATH_: stores binary data 1 and 0 indicating individual's death occurance;
	- _DEATH_AGE_: contains the age at death or age of the induvidual if death didn't occur.
- _FINNGEN_MINIMUM_DATA_: FinnGen minimum phenotype data with the following columns:
	- _FINNGENID_: study ID;
	- _BL_YEAR_: year of DNA sample collection;
	- _BL_AGE_: age at DNA sample collection;
	- _SEX_: gender of individual;
	- _regionofbirthname_: regional councils numbers for region of birth according to Finnish Minister of the Interior.
- _FINNGEN_COHORT_DATA_: tab-separated FinnGen cohort file with two columns: 
	- _FINNGENID_: study ID;
	- _cohort_: includes name of the cohort to which each sample belongs to.
- _FGFACTORY_PASS_SAMPLES_: colon-separated file containing FinnGen factory pass samples and additional informatioon on the batch, cohort, number of  variants, etc. summarized below (format example: "BATCH:COHORT:RELEASE:VARIANTS:CHIP:FINNGENID"). File is generate for the release by eScience team via module `fgfactory_pass_samples.wdl`:
	- _BATCH_: batch to which each sample belongs to;
	- _COHORT_: cohort to which each sample belongs to;
	- _RELEASE_: release name;
	- _VARIANTS_: number of variants in the batch;
	- _CHIP_: chip used for genotyping the batch;
	- _FINNGENID_: study ID.

**Outputs**: 
- _BASIC_INFO_PHENOTYPE_FILE_: Tab-separated file combining information above is produced. File contains the following columns:
	- _FINNGENID_: study ID;
	- _DEATH_: stores binary data 1 and 0 indicating individual's death occurance;
	- _SEX_: individual's gender;
	- _AGE_AT_DEATH_OR_NOW_: contains the age at death or age of the induvidual if death didn't occur;
	- _regionofbirthname_: regional councils numbers for region of birth according to Finnish Minister of the Interior;
	- _cohort_: cohort to which each sample belongs to;
	- _BATCH_: batch to which each sample belongs to;
	- _CHIP_: chip used for genotyping the batch;
	- -ARRAY_: binary column indicating whether the sample was genotyped using FinnGen Axiom (1) or Legacy (0) chip technology. 


## STEP 2. Prepare chips

Chip variants file contains information about to which batch(es) each variant belongs to. In order to prepare chip variants file for the genotype browser running on FinnGen data, run the following script: 
```
bash get_chip_from_anno_updated.sh \
RELEASE_VARIANT_ANNOTATION_FILE \
CHIPVARS_FILE
```

### Parameters description

**Inputs**: 
- _RELEASE_VARIANT_ANNOTATION_FILE_: file produced by analysis team's annotation pipeline. File contains scraped fields from released imputed merged VCF files joined with external (e.g. VEP) annotation which includes annotation of variants with AF, INFO, consequence etc, one variant per row. Find more on file preparation in the following links: https://github.com/FINNGEN/finngen-analysis-overview#release-variant-annotation-file- and https://github.com/FINNGEN/commons/tree/master/variant_annotation. 

**Outputs**: 
- _CHIPVARS_FILE_: tab-separated file without the header containing two columns: column storing variant id in CHR:POS:REF:ALT format and column storing name of the batch in which variant is present.


## STEP 3. Prepare gene annotation table 

Gene annotation table contains basic gene annotations using build 38. Chromosome names for non-autosomal chromosomes are renamed in the following way: 
- Chromosome X is renamed to 23;
- Chromosome Y is renamed to 24;
- Chromosome M is renamed to 25.

In order to prepare gene annotation table for the genotype browser, run the following script: 

```
python3 prepare_gene_ann.py \
-a GENE_ANNOTATION_REFERENCE_FILE_GTF \
-o GENE_ANNOTATION_FILE
```

### Parameters description
**Inputs**: 
- _GENE_ANNOTATION_REFERENCE_FILE_GTF_: gene annotation file in GTF format, e.g. GENCODE annotation file (e.g. http://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_38/gencode.v38.annotation.gtf.gz).


**Outputs**: 
- _GENE_ANNOTATION_FILE_: tab-separated CSV file with header and basic gene annotation information including columns: chr, start, end, strand, gene_name, gene_id, gene_type.


## STEP 4. Prepare raw chip annotation file 

Raw chip annotation file includes annotations for the chip data (noot imputed) variants.
File contains fields from released FinnGEn chip data VCF files joined with external VEP annotation which includes annotation of variants with AF, consequence etc, one variant per row. Additionally, file contains gnomAD genomes/exomes annotations including consequence (gnomAD genome), enrichment nfsee scores (extracted from both, gnomAD genomes & gnomAD exomes). In order to prepare gene annotation table for the genotype browser, run the following script: 

```
python3 prepare_rawchip_vars.py \
-g GNOMAD_ANNO_CHIPVARS_GENOMES_GZ \
-e GNOMAD_ANNO_CHIPVARS_EXOMES_GZ \
-a CHIP_ANNOTATED_VARIANTS_FINNGEN_RELEASE_GZ \
-o VARIANT_ANNOTATION_FILE_CHIP_PANEL
```

### Parameters description
**Inputs**: 
1. _GNOMAD_ANNO_CHIPVARS_GENOMES_GZ_: gnomAD genomes annotaion file filtered to FinnGen chip variants (gzipped);
2. _GNOMAD_ANNO_CHIPVARS_EXOMES_GZ_: gnomAD exomes annotaion file filtered to FinnGen chip variants (gzipped)
3. _CHIP_ANNOTATED_VARIANTS_FINNGEN_RELEASE_GZ_: file produced (gzipped) by analysis team's annotation pipeline for the FinnGen chip data. File contains VEP annotation which includes annotation of variants with AF, INFO, consequence etc, one variant per row. Find more on file preparation in the following links: https://github.com/FINNGEN/finngen-analysis-overview#release-variant-annotation-file- and https://github.com/FINNGEN/commons/tree/master/variant_annotation. 

**Outputs**: 
- _VARIANT_ANNOTATION_FILE_CHIP_PANEL_: tab-separated file which contains combined fields from gnomAD genomes/exomes annotations as well as VEP annotation of variants from genotyped chip reference panel, contains seven columns: chr, start, end, strand, gene_name, gene_id, gene_type.


## STEP 5. Prepare combined variant annotation file

Variant annotation file contains combined annotations from imputed and chip data (variant annotation file for the chip data is the one prepared on the previous step). First, add lacking columns to the variant annotation file prepared for imputation reference panel by running:
```
bash add_chr_pos_cols2anno.sh \
VARIANT_ANNOTATION_FILE_IMPUTED_PANEL_GZ \
VARIANT_ANNOTATION_FILE_IMPUTED_PANEL_ADDED_COLS
```

File _VARIANT_ANNOTATION_FILE_IMPUTED_PANEL_GZ_ is produced by analysis team's pipeline and contatins combined fields from gnomAD genomes/exomes annotations as well as VEP annotation of variants from imputation reference panel.
Output: _VARIANT_ANNOTATION_FILE_IMPUTED_PANEL_ADDED_COLS_ in gzipped format.

Next, combine annotations for imputed and raw chip data:
```
python3 combine_imputed_and_rawchip_vars.py \
-c VARIANT_ANNOTATION_FILE_CHIP_PANEL \
-i VARIANT_ANNOTATION_FILE_IMPUTED_PANEL_ADDED_COLS \
-o VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP

gzip VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP
```

### Parameters description
**Inputs**: 
1. _VARIANT_ANNOTATION_FILE_CHIP_PANEL_: tab-separated file which contains combined fields from gnomAD genomes/exomes annotations as well as VEP annotation of variants from genotyped chip reference panel;
2. _VARIANT_ANNOTATION_FILE_IMPUTED_PANEL_ADDED_COLS_GZ_: tab-separated file which contains combined fields from gnomAD genomes/exomes annotations as well as VEP annotation of variants from imputed reference panel;

**Outputs**: 
- _VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP_: tab-separated CSV file with header and with seven columns: chr, start, end, strand, gene_name, gene_id, gene_type.


## STEP 6. Populate variant annotation database

Create and populate database with data generated at steps 2 (CHIPVARS_FILE), 3 (GENE_ANNOTATION_FILE) and 5 (VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP):
```
python3 populate_sqlite_updated.py \
--variant_annotation_file VARIANT_ANNOTATION_FILE_COMBINED_IMPUTED_CHIP \
--variant_chip_file CHIPVARS_FILE \
--genes_anno_file GENE_ANNOTATION_FILE \
--sqlite_db SQLITE_DB_OUT
```


## R7 data preparation

Input data files are located at: `gs://fgfactory-staging-input-data/genotype_browser/finngen_R7/input_data/`
Output data files are located at: `gs://fgfactory-staging-input-data/genotype_browser/finngen_R7/output_data/`

Download input data to your Compute Engine VM:
```
gsutil -m cp `gs://fgfactory-staging-input-data/genotype_browser/finngen_R7/input_data/* .`
```

1. Prepare basic info file:
```
# output folder
mkdir out

# extract death endpoint from finngen endpoints file
zcat finngen_R7_endpoint.txt.gz | cut -f 1-10 > finngen_R7_endpoint_death_extracted.txt.gz

# run the script
python3 merge_basic_info.py \
R7_321464_samples.txt \
finngen_R7_endpoint_death_extracted.txt \
finngen_R7_minimum.txt.gz \
finngen_R7_cohort.txt.gz \
fgfactory_pass_samples_R7.txt \
out/finngen_R7_gt_samples_info.txt
```

2. Prepare chip file:
```
bash get_chip_from_anno.sh \
R7_annotated_variants_v0.gz \
out/R7_chipvars.txt.gz
```

3. Prepare gene annotation table:
```
wget http://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_38/gencode.v38.annotation.gtf.gz

python3 prepare_gene_ann.py \
-a gencode.v38.annotation.gtf.gz \
-o out/gencode.v38.annotation.extracted.genes.gb.csv
```

4. Prepare raw chip variant annotation file:
```
python3 prepare_rawchip_vars.py \
-g AxiomGT1_V2P2.chipvariants.fin_enriched_genomes.txt.gz \
-e AxiomGT1_V2P2.chipvariants.fin_enriched_exomes.txt.gz \
-a R5_chip_annotated_variants.gz \
-o out/R5_rawchip_vars_annotated.csv
```

5. Combine annotations for variants from raw chip and imputed reference panels:
```
bash add_chr_pos_cols2anno.sh r7.fg.gnomad21.imp.anno.gz r7.fg.gnomad21.imp.anno_added_cols.csv

python3 combine_imputed_and_rawchip_vars.py \
-c out/R5_rawchip_vars_annotated.csv \
-i r7.fg.gnomad21.imp.anno_added_cols.csv.gz \
-o out/R7_imputed_and_R5_rawchip_vars_annotation_combined.csv

gzip out/R7_imputed_and_R5_rawchip_vars_annotation_combined.csv
```


6. Populate variant annotation database
   
```
python3 populate_sqlite_updated.py \
--variant_annotation_file out/R7_imputed_and_R5_rawchip_vars_annotation_combined.csv.gz \
--variant_chip_file out/R7_chipvars.txt.gz \
--genes_anno_file out/gencode.v38.annotation.extracted.genes.gb.csv \
--sqlite_db out/fgq.r7.1.db
```


