#!/usr/bin/python3

import pandas as pd
import numpy as np
from datetime import datetime

gt_samples = pd.read_csv('/mnt/nfs/r6/R6_271341_samples.txt', names=['FINNGENID'])
death = pd.read_csv('/mnt/nfs/r6/pheno/finngen_R6_v2_endpoint_death.gz', sep='\t')
minimum = pd.read_csv('/mnt/nfs/r6/pheno/finngen_R6_v2_minimum.gz', sep='\t', usecols=['FINNGENID', 'BL_YEAR', 'BL_AGE', 'SEX', 'regionofbirthname'])
cohort = pd.read_csv('/mnt/nfs/r6/pheno/finngen_R6_v2.1_cohort.gz', names=['FINNGENID', 'cohort'], sep='\t')
array = pd.read_csv('/mnt/nfs/r6/fgfactory_pass_samples_R6_NA_removed.txt', sep=':')

data = gt_samples.merge(death, how='left', on='FINNGENID')
data = data.merge(minimum, how='left', on='FINNGENID')
data = data.merge(cohort, how='left', on='FINNGENID')
data = data.merge(array, how='left', on='FINNGENID')

data['AGE_AT_DEATH_OR_NOW'] = np.where(data['DEATH']==1, data['DEATH_AGE'], data['BL_AGE'] + datetime.now().year - data['BL_YEAR'])
data = data[['FINNGENID', 'DEATH', 'SEX', 'AGE_AT_DEATH_OR_NOW', 'regionofbirthname', 'cohort', 'BATCH', 'CHIP']]

data = data.round({'AGE_AT_DEATH_OR_NOW': 1})
data['DEATH'] = data['DEATH'].astype('Int64')
data['SEX'] = np.where(data['SEX'] == 'female', 1, 0)
data['ARRAY'] = np.where(data['CHIP'].str.startswith('Axiom'), 1, 0)

data.to_csv('/mnt/nfs/r6/pheno/finngen_R6_gt_samples_info_2.txt.gz', sep='\t', index=False, na_rep='NA')
