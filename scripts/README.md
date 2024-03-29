# DATA PREPARATION FOR THE GENOTYPE BROWSER

## Summary of data resources needed
1) Imputed genotype data (vcf files) 
2) Chip genotype data (vcf files)
3) Chip data cluster plots (TSV files)
4) Chip genotype annotations (Requiered in ETL)
5) Imputation genotype annotation (Requiered in ETL)
6) FACTORY PASS SAMPLES. Genotyping metadata (Requiered in ETL)
7) Phenotype data: FINNGEN_ENDPOINT (Requiered in ETL)
8) Phenotype data FINNGEN_MINIMUM_COHORT_DATA (Requiered in ETL)
9) Public gene annotation reference GENE_ANNOTATION_REFERENCE_FILE_GTF (Requiered in ETL)
10) Configuration file to specifying  inputs (example attached)


## Requirements:
 -      make sure you have cloned the genotype browser repo and that you have installed the required packages (please refer to the main readme)
 -	tabix package: sudo apt-get update && sudo apt-get install tabix
 -	to use pandas read_csv (>=0.24) to read gcs objects : pip install gcsfs 
 
The inputs needed for preparing the sqlite database for genotype browser should be given in a text file (e.g. see ‘GB_input_R11.txt’ in this folder). These inputs include the following:

**NOTE** In case either of your input files FINNGEN_MINIMUM_COHORT_DATA or FGFACTORY_PASS_SAMPLES are read from the production library red bucket, run authentication command `gcloud auth login --update-adc` before running the scripts - even though the method is outdated in gcloud this is required to avoid vpc organization policy error when reading data by pandas package directly from the production bucket.

1.	**OUTPUT_PATH**: The path for all the outputs of the ‘prepare_genotypeB_input.sh’, default is "$HOME/GB_out_$RELEASE_PREFIX". 

2.	**RELEASE_PREFIX**: The release number to be added to the output files in the format ^[rR][0-9]+$  e.g r9 or R9

3.	**FGFACTORY_PASS_SAMPLES**: colon-separated file containing FinnGen factory pass samples and additional informatioon on the batch, cohort, number of variants, etc. summarized below (format: "BATCH:COHORT:RELEASE:VARIANTS:CHIP:FINNGENID"). File is generated for each release by eScience team:
	- BATCH: batch which each sample belongs to;
	- COHORT: cohort which each sample belongs to;
	- RELEASE: release name;
	- VARIANTS: number of variants in the batch;
	- CHIP: chip used for genotyping the batch;
	- FINNGENID: study ID.

4.	**FINNGEN_ENDPOINT**: Finngen endpoint usually found in red library

5.	**FINNGEN_MINIMUM_COHORT_DATA**: FinnGen minimum phenotype data containing also the cohort column starting from df11,with the following columns:
	- FINNGENID: study ID;
	- BL_YEAR: year of DNA sample collection;
	- BL_AGE: age at DNA sample collection;
	- SEX: gender of individual;
	- regionofbirthname: regional councils numbers for region of birth according to Finnish Minister of the Interior.
	- cohort: includes name of the cohort which each sample belongs to.

7.	**IMPU_RELEASE_VARIANT_ANNOTATION_FILE**: file produced by analysis team's annotation pipeline. File contains scraped fields from released imputed merged VCF files joined with external (e.g. VEP) annotation which includes annotation of variants with AF, INFO, consequence etc, one variant per row. Find more on file preparation in the following links: https://github.com/FINNGEN/finngen-analysis-overview#release-variant-annotation-file- and https://github.com/FINNGEN/commons/tree/master/variant_annotation. In short variants from each release (if they are different from the previous release or the VEP annotation need to be changed) are annotated with the VEP/hail pipeline. Then that annotation file is joined with INFO fields scraped from all the imputed vcf files using a version of the “scrape_annot[_VERSION].wdl” workflow depending on the version of the imputation panel used for imputation. As long as the imputation panel or the VEP annotation doesn’t change, this file stays the same across releases. The produced annotation file (starting from release9) will also contain rsids which are needed in latter steps.

8.	**CHIP_RELEASE_VARIANT_ANNOTATION_FILE**: file produced by annotation pipeline of the analysis team for the FinnGen chip data. File contains VEP annotation which includes annotation of variants with AF, INFO, consequence etc, one variant per row. Find more on file preparation in the following links: https://github.com/FINNGEN/finngen-analysis-overview#release-variant-annotation-file- and https://github.com/FINNGEN/commons/tree/master/variant_annotation. In this case too, if the VEP annotations needs to change or the variants have changed from the previous release, first the VEP/hail pipeline has to be run. QCd chip variants may change at each release because the variants are dropped/included based on QC but there will be a VEP annotation for all the chip variants available (regardless of QC), so unless the chip content changes in next releases this VEP annotation can be used for future releases by running just the scrape_annot[_VERSION].wdl with the respective chip vcfs for that release. The rsids will also be included in this file. 

9.	**GENE_ANNOTATION_REFERENCE_FILE_GTF**: gene annotation file in GTF format, e.g. GENCODE annotation file (e.g. http://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_38/gencode.v38.annotation.gtf.gz).

## How to run the script
```
./prepare_genotypeB_input.sh <file_containing_inputs e.g. GB_input_R9.txt>
```
