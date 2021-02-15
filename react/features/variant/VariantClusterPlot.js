import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Plot from 'react-plotly.js'
import { defaultLayout } from '../../config/plotConfig'
import { createAsyncThunk } from '@reduxjs/toolkit'


export const VariantClusterPlot = () => {

    const variant = useSelector(state => state.data.variants)
    const [status, setData] = useState(null)
    const [selection, setSelection] = useState('all')    
    var content = null
    var drop_section = false
    var error_message = null

    const handlePlotTypeChange = event => {
    	setSelection(event.target.value)
    }

    useEffect (() => {
        if (variant.length == 1){
            fetch('/api/v1/clusterplot/' + selection + '/' + variant).then((res) => {
                setData(res.status)
            })
        }
    })

    if (variant.length == 1) {
        // 404: varaint exists in raw chip but no plot was found
        if (status && status == 404){
            error_message = "Variant exists in FinnGen chip but no cluster plot was found. Contact helpdesk to report the issue."
        // varaint does not exist in raw chip' -> imputed data
        } else if (status && status == 410){
           drop_section = true
        } else if (status && status == 500){
           error_message = "Internal server error, let us know."
        } else if (status && status == 400){
           error_message = "Error parsing the data."
        }
    } else {
        drop_section = true
    }

    if (status == 200) {
        content = (
            <div style={{width: "600px", height: "600px"}}>
                <img style={{maxWidth: "100%", maxHeight: "100%"}} id="img" src={`/api/v1/clusterplot/${selection}/${variant}`} />
            </div>
        )
    } else {
        content = (
            <div style={{width: "600px", height: "600px"}}>
                {error_message}
            </div>
        )
    }

    return (
    	<div>
    	{
            drop_section ? '' :
            <div>
                <form>
                    <label htmlFor="cluster_plot">Choose a type of SNP cluster plot:</label>
                        <select style={{marginLeft: '5px', padding: '5px'}} name="cluster_plot" id="cluster_plot" onChange={handlePlotTypeChange}>
                            <option value="all">All</option>
                            <option value="missing_imputation">Missing imputation</option>
                            <option value="sex_separated">Sex-separated</option>
                        </select>
                </form>
                {content}
            </div>
        }
    	</div>
    )
}
