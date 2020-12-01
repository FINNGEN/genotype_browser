import random
import pandas as pd
import numpy as np

real_data = pd.read_csv('/mnt/nfs/r6/pheno/finngen_R6_gt_samples_info_2.txt.gz', sep='\t')
real_data = real_data[real_data['AGE_AT_DEATH_OR_NOW'].notnull()].fillna("NA")
regions = list(real_data['regionofbirthname'])
cohorts = list(real_data['cohort'])
bca = list(real_data['BATCH'] + '|' + real_data['CHIP'] + '|' + real_data['ARRAY'].astype(str))

age_mean = np.average(real_data['AGE_AT_DEATH_OR_NOW'])
age_sd = np.std(real_data['AGE_AT_DEATH_OR_NOW'])
death_prob = len(real_data[real_data['DEATH']==1])/len(real_data)
sex_prob = len(real_data[real_data['SEX']==1])/len(real_data)

print('\t'.join(['FINNGENID', 'DEATH', 'SEX', 'AGE_AT_DEATH_OR_NOW', 'regionofbirthname', 'cohort', 'BATCH', 'CHIP', 'ARRAY']))
dummy_ids = [line.strip() for line in open('ids.dummy', 'rt').readlines()]
for id in dummy_ids:
    death = np.random.binomial(1, death_prob)
    sex = np.random.binomial(1, sex_prob)
    age = np.random.normal(age_mean, age_sd)
    region = random.choice(regions)
    cohort = random.choice(cohorts)
    batch_chip_array = random.choice(bca).split('|')
    print('\t'.join([id, str(death), str(sex), str(age), str(region), str(cohort), str(batch_chip_array[0]), str(batch_chip_array[1]), str(batch_chip_array[2])]))
