import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { VariantPlotCohort } from './VariantPlotCohort'
import { VariantPlotAge } from './VariantPlotAge'
import { VariantClusterPlot } from './VariantClusterPlot'

export const VariantPlots = () => {

    return (
	    <div>
	    <VariantPlotCohort />
	    <VariantPlotAge />
	    <VariantClusterPlot />
	    </div>
    )
}
