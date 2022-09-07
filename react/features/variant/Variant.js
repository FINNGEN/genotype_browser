import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { VariantPlots } from './VariantPlots'
import {
    fetchData,
    gtCount,
    setData
} from '../data/dataSlice'

import { setOption } from '../data/dataSlice'


export const Variant = (props) => {

    const gtCnt = useSelector(gtCount)
    const dispatch = useDispatch()
    const data = useSelector(state => state.data)
    const dtype = useSelector(state => state.data.data_type)  
    const search_status =  useSelector(state => state.search.status)
    const options = useSelector(state => state.data.options) 
    const source = dtype == 'imputed' ? 'Imputed data' : 'Raw chip data' 

    var varlen = 1
    if (data != undefined){
    	if ( data.variants!= undefined ){
    		varlen = data.variants.length
   		}
    }

    useEffect(() => {
    if (search_status != 'failed'){
    	if (data.status == 'idle') { //fetch by default
	    dispatch(fetchData(`/api/v1/variants/${props.props.variant}?` + new URLSearchParams({...data.filters, ...data.serverOptions, ...{'data_type': dtype}})))
	} else {
	    const unordered = {...data.filters, ...data.serverOptions, ...{'data_type': dtype}}
	    const ordered = {}
	    Object.keys(unordered).sort().forEach(key => { ordered[key] = unordered[key] })
	    // console.log('Variant.js:', `${props.props.variant}+${JSON.stringify(ordered)}`)
	    const stored = sessionStorage.getItem(`${props.props.variant}+${JSON.stringify(ordered)}`)
	    if (stored) {
			// console.log('cache hit')
	    	dispatch(setData(JSON.parse(stored)))
	    } else if (data.status != 'loading') {
	    	dispatch(fetchData(`/api/v1/variants/${props.props.variant}?` + new URLSearchParams({...data.filters, ...data.serverOptions, ...{'data_type': dtype}})))
	    }
	}
    }
    }, [data.filters, data.serverOptions, props, data.data_type])

    const optionChanged = (opt, event) => {
	dispatch(setOption({opt: opt, content: event.target.value}))
    }

    let content = (<div>loading...</div>)
    if (data.status == 'failed') {
	const errorMsg = data.error.status == 400 ?
	      'Bad request, did you format the variant correctly? e.g. 7-5397122-C-T' :
	      data.error.status == 404 ?
	      	`Variant${varlen > 1 ? 's' : ''} not found in ${source.toLowerCase()}.` :
	      data.error.status == 500 ?
	      'Internal server error, let us know.' :
	      `${data.error.status} oh no, something went wrong`
	content = (<div style={{color: 'red'}}>{errorMsg}</div>)
    }
    if (data.status == 'done') {
	//after info score, there's a bug though that this doesn't currently update because it's not in data.data
	//<tr><td>wall time</td><td style={{textAlign: 'right'}}>{`${data.time.fetch.toPrecision(3)}+${data.time.munge.toPrecision(3)}`}</td></tr>
	
	var impscore = null
	if (dtype == 'imputed') {
		impscore = (<tr><td>imputation info score</td><td style={{textAlign: 'right'}}>{data.data.info < 0 ? 'NA' : data.data.info.toPrecision(3)}</td></tr>)
	} 

	// <div className="hl" style={{borderTop: "1px solid #dddddd", marginTop: "0px", marginBottom: "10px"}}></div>
	var show_panel_content = (
		<div style={{display: 'flex', flexDirection: 'column', width: 'max-content'}}>
		    <div><h3 style={{marginBottom: "10px", marginTop: "20px"}}>Show</h3></div>
		    
		    <div style={{display: 'flex', flexDirection: 'row'}}>

			    <div className="buttonGroup">
			    <div><input type="radio" value="freq" name="cntfreq" onChange={optionChanged.bind(this, 'cntfreq')} checked={options.cntfreq == 'freq'} /><span>allele frequency</span></div>
			    <div><input type="radio" value="gt_count" name="cntfreq" onChange={optionChanged.bind(this, 'cntfreq')} checked={options.cntfreq == 'gt_count'} /><span>number of genotypes</span></div>				    
				    <div className="buttonGroup">
				    {
				    	options.cntfreq == 'gt_count' && options.barmap == 'map' && options.bbreg == 'region' ?
				    	<div>
						    <div style={{ marginLeft: "20px" }}><input type="radio" value="het" name="maphethom" checked={options.maphethom == 'het'} onChange={optionChanged.bind(this, 'maphethom')}/><span>show het</span></div>
						    <div style={{ marginLeft: "20px" }}><input type="radio" value="hom" name="maphethom" checked={options.maphethom == 'hom'} onChange={optionChanged.bind(this, 'maphethom')}/><span>show hom</span></div>						    
					    </div> 
					    : null
				    }
				    </div>
			    </div>

			    <div className="buttonGroup">
				    <div onChange={optionChanged.bind(this, 'bbreg')}><input type="radio" value="region" name="bbreg" defaultChecked/><span>by region of birth</span></div>
				    {
				    	options.bbreg == 'region' ?
				    	<div>
					    <div style={{ marginLeft: "20px" }}><input type="radio" value="map" name="barmap" checked={ options.barmap == 'map'} onChange={optionChanged.bind(this, 'barmap')} /><span>show as map</span></div>
					    <div style={{ marginLeft: "20px" }}><input type="radio" value="bar" name="barmap" checked={ options.barmap == 'bar'} onChange={optionChanged.bind(this, 'barmap')} /><span>show as barplot</span></div>				    
					    </div> 
					    : null
				    }
				    <div onChange={optionChanged.bind(this, 'bbreg')} ><input type="radio" value="biobank" name="bbreg"/><span>by biobank</span></div>
		    	</div>
		 </div>
		</div>
	)
	
	content = (<div>
		   <div style={{display: 'flex', flexDirection: 'column'}}>
		   <div><h3 style={{marginTop: "20px", marginBottom: "10px"}}>Result summary statistics</h3></div>
		   <div style={{display: 'flex', flexDirection: 'row'}}>
			   <table style={{width: '200px'}}>
			   <tbody>
			   <tr><td style={{textAlign: 'right'}}>{data.data.total_indiv}</td><td>individual{data.data.total_indiv == 1 ? null : 's'}</td></tr>
			   <tr><td style={{textAlign: 'right'}}>{gtCnt[0]}</td><td>heterozygote{gtCnt[0] == 1 ? null : 's'}</td></tr>
			   <tr><td style={{textAlign: 'right'}}>{gtCnt[1]}</td><td>homozygote{gtCnt[1] == 1 ? null : 's'}</td></tr>
			   <tr><td style={{textAlign: 'right'}}>{gtCnt[2]}</td><td>WT homozygote{gtCnt[2] == 1 ? null : 's'}</td></tr>
			   <tr><td style={{textAlign: 'right'}}>{gtCnt[3]}</td><td>missing GT</td></tr> 
			   </tbody>
			   </table>
			   <table style={{paddingLeft: '20px'}}>
			   <tbody>
			   <tr><td>allele frequency</td><td style={{textAlign: 'right'}}>{data.data.total_af < 0 ? 'NA' : data.data.total_af.toPrecision(3)}</td></tr>
			   {impscore}
			   </tbody>
			   </table>
		   </div>
		   {show_panel_content}
		   <VariantPlots />
		   </div>
		   </div>)
    }

    return (
    	search_status == 'failed' ? null : ( <div>{content}</div>)
    )
}
