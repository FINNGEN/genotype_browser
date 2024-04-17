import logging

use_gcp_buckets = ''
red_bucket = ''
green_bucket = ''
intensity_files_location = ''
intensity_data_fields = ['ID']
geojson = '#GEOJSON#'

sqlite_db = '#DB#'
basic_info_file = '#BASIC_INFO_PHENOTYPE_FILE#'
release_version = 'INTEGRATION_TEST'

vcf_files = {
    "read_from_bucket": True,
    "imputed_data": [
#IMPU_RELEASE_VCFS#
    ],
    "chip_data": [
#CHIP_RELEASE_VCFS#
    ]
}

qc = []
log_level = logging.INFO
