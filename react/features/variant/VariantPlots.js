import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { VariantPlotCohort } from './VariantPlotCohort'
import { VariantPlotAge } from './VariantPlotAge'
import { VariantClusterPlot } from './VariantClusterPlot'
import { VariantPlotMap } from './VariantPlotMap.js'

export const VariantPlots = () => {

	const options = useSelector(state => state.data.options)    

    return (
	    <div style={{marginTop: "20px"}}>
	    {
	    	options.barmap == 'map' && options.bbreg == 'region' ? <VariantPlotMap /> : <VariantPlotCohort /> 
	    } 
	    <VariantPlotAge />
	    <VariantClusterPlot />
	    </div>
    )
}
