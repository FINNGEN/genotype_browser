import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { VariantPlotCohort } from './VariantPlotCohort'
import { VariantPlotAge } from './VariantPlotAge'

export const VariantPlots = () => {

    return (
	    <div>
	    <VariantPlotCohort />
	    <VariantPlotAge />
	    </div>
    )
}
