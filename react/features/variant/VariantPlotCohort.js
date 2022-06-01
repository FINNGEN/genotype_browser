import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Plot from 'react-plotly.js'
import { defaultLayout } from '../../config/plotConfig'

export const VariantPlotCohort = () => {

    const data = useSelector(state => state.data.data)
    const options = useSelector(state => state.data.options)
    const use_data = options.bbreg == 'biobank' ? data.agg.cohorts : data.agg.regions
    let traces
    if (options.cntfreq == 'freq') {
	traces = [{
	    y: use_data.names,
	    x: use_data.af,
            name: 'allele frequency',
	    type: 'bar',
	    orientation: 'h'
	}]
    } else if (options.cntfreq == 'gt_count') {
	traces = ['het', 'hom_alt'].map((type, i) => ({
	    y: use_data.names,//.map((name, i) => `${name} (${use_data.num_indiv[i]})`),
	    x: use_data.gt_counts[i],
            name: type == 'het' ? 'heterozygous' : 'homozygous',
	    type: 'bar',
	    orientation: 'h'
	}))
    } else if (options.cntfreq == 'indiv_count') {
	traces = [{
	    y: use_data.names,
	    x: use_data.num_indiv,
            name: 'individuals',
	    type: 'bar',
	    orientation: 'h'
	}]
    } else throw Error(`unsupported options.cntfreq: ${options.cntfreq}`)

    const layout = {
	...defaultLayout,
	barmode: 'stack',
	title: options.cntfreq == 'freq' ?
	    `allele frequency by ${options.bbreg == 'biobank' ? 'biobank' : 'region of birth'}` :
	    options.cntfreq == 'gt_count' ?
	    `number of genotypes by ${options.bbreg == 'biobank' ? 'biobank' : 'region of birth'}` :
	    `number of individuals by ${options.bbreg == 'biobank' ? 'biobank' : 'region of birth'}`
    }
    return (
	    <div style={{float: 'left'}}>
	    <Plot
	data={traces}
        layout={layout}
	    />
	</div>
    )
}
