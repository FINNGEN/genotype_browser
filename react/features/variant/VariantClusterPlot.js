import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Plot from 'react-plotly.js'
import { defaultLayout } from '../../config/plotConfig'
import { createAsyncThunk } from '@reduxjs/toolkit'


export const VariantClusterPlot = () => {

    const variant = useSelector(state => state.data.variants)
    const [imageLoaded, setImage] = useState(false)
    const [selection, setSelection] = useState('all')
    
    const handlePlotTypeChange = event => {
    	setSelection(event.target.value)
    }

    useEffect (() => {
        fetch('/api/v1/clusterplot/' + selection + '/' + variant).then((res) => setImage(res.ok))
    })

    return (
    	<div>
    		<form>
    			<label htmlFor="cluster_plot">Choose a type of SNP cluster plot:</label>
    				<select style={{marginLeft: '5px', padding: '5px'}} name="cluster_plot" id="cluster_plot" onChange={handlePlotTypeChange}>
    					<option value="all">All</option>
    					<option value="missing_imputation">Missing imputation</option>
    					<option value="sex_separated">Sex-separated</option>
    				</select>
    		</form>
    		<div style={{width: "600px", height: "600px"}}>
            { 
                imageLoaded ? 
                <img style={{maxWidth: "100%", maxHeight: "100%"}} id="img" src={`/api/v1/clusterplot/${selection}/${variant}`} />
                :
                "Cluster plot NOT FOUND."
            }
    	   </div>
    	</div>
    )
}
