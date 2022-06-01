import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { VariantPlotCohort } from './VariantPlotCohort'
import { VariantPlotAge } from './VariantPlotAge'
import { VariantClusterPlot } from './VariantClusterPlot'
import { VariantPlotMap } from './VariantPlotMap.js'

export const VariantPlots = () => {
    return (
	    <div>
		<VariantPlotCohort /> 
	    <VariantPlotAge />
	    <VariantPlotMap />
	    <VariantClusterPlot />
	    </div>
    )
}
