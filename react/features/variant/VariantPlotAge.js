import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Plot from 'react-plotly.js'
import { defaultLayout } from '../../config/plotConfig'

export const VariantPlotAge = () => {

    const data = useSelector(state => state.data.data)

    const traces = ['het', 'hom_alt'].map(type => ({
        x: data[type][data.columns.indexOf('AGE_AT_DEATH_OR_NOW')],
        name: type == 'het' ? 'heterozygous' : 'homozygous',
        type: 'histogram'
    }))
    
    const layout = {
	...defaultLayout,
	//need to give empty object, otherwise y axis not shown
	yaxis: {
	},
	xaxis: {
	    range: [0, 110]
	},
	title: 'number of genotypes by current age or age at death',
	barmode: 'stack'
    }
    return (
	    <Plot
	data={traces}
        layout={layout}
	    />
    )
}
