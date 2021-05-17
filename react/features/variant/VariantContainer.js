import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Variant } from './Variant'
import { VariantForm } from './VariantForm'

export const VariantContainer = ({ match: { params } }) => {
    // external links after header
    // <div style={{paddingLeft: '20px'}}><a href={`https://results.finngen.fi/variant/${params.variant}`} target='_blank'>pheweb</a></div>
    // <div style={{paddingLeft: '10px'}}><a href={`https://gnomad.broadinstitute.org/variant/${params.variant}?dataset=gnomad_r3`} target='_blank'>gnomad</a></div>
    // <div style={{paddingLeft: '10px'}}><a href={`https://genetics.opentargets.org/variant/${params.variant.replace(/-/g, '_')}`} target='_blank'>opentargets</a></div>
    return (
	    <div>
	    <VariantForm props={params}/>
	    <div style={{paddingTop: '10px'}}>
	    <Variant props={params}/>
	    </div>
	    </div>
    )
}
