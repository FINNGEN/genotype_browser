import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { VariantPlots } from './VariantPlots'
import {
    fetchData,
    gtCount,
    setData
} from '../data/dataSlice'

export const Variant = (props) => {

    const gtCnt = useSelector(gtCount)
    const dispatch = useDispatch()
    const data = useSelector(state => state.data)

    useEffect(() => {
	if (data.status == 'idle') { //fetch by default
	    dispatch(fetchData(`/api/v1/variants/${props.props.variant}?` + new URLSearchParams({...data.filters, ...data.serverOptions})))
	} else {
	    const unordered = {...data.filters, ...data.serverOptions}
	    const ordered = {}
	    Object.keys(unordered).sort().forEach(key => { ordered[key] = unordered[key] })
	    //console.log(`${props.props.variant}+${JSON.stringify(ordered)}`)
	    const stored = sessionStorage.getItem(`${props.props.variant}+${JSON.stringify(ordered)}`)
	    if (stored) {
		console.log('cache hit')
	    	dispatch(setData(JSON.parse(stored)))
	    } else if (data.status != 'loading') {
	    	dispatch(fetchData(`/api/v1/variants/${props.props.variant}?` + new URLSearchParams({...data.filters, ...data.serverOptions})))
	    }
	}
    }, [data.filters, data.serverOptions, props])

    let content = (<div>loading...</div>)
    if (data.status == 'failed') {
	const errorMsg = data.error.status == 400 ?
	      '400 bad request, did you format the variant correctly? e.g. 7-5397122-C-T' :
	      data.error.status == 404 ?
	      '404 variant not found, sorry' :
	      data.error.status == 500 ?
	      '500 internal server error, let us know' :
	      `${data.error.status} oh no, something went wrong`
	content = (<div>{errorMsg}</div>)
    }
    if (data.status == 'done') {
	//after info score, there's a bug though that this doesn't currently update because it's not in data.data
	//<tr><td>wall time</td><td style={{textAlign: 'right'}}>{`${data.time.fetch.toPrecision(3)}+${data.time.munge.toPrecision(3)}`}</td></tr>
	content = (<div>
		   <div style={{display: 'flex'}}>
		   <table style={{width: '200px'}}>
		   <tbody>
		   <tr><td style={{textAlign: 'right'}}>{data.data.total_indiv}</td><td>individual{data.data.total_indiv == 1 ? '' : 's'}</td></tr>
		   <tr><td style={{textAlign: 'right'}}>{gtCnt[0]}</td><td>heterozygote{gtCnt[0] == 1 ? '' : 's'}</td></tr>
		   <tr><td style={{textAlign: 'right'}}>{gtCnt[1]}</td><td>homozygote{gtCnt[1] == 1 ? '' : 's'}</td></tr>
		   </tbody>
		   </table>
		   <table style={{paddingLeft: '20px'}}>
		   <tbody>
		   <tr><td>allele frequency</td><td style={{textAlign: 'right'}}>{data.data.total_af < 0 ? 'NA' : data.data.total_af.toPrecision(3)}</td></tr>
		   <tr><td>imputation info score</td><td style={{textAlign: 'right'}}>{data.data.info < 0 ? 'NA' : data.data.info.toPrecision(3)}</td></tr>
		   </tbody>
		   </table>
		   </div>
		   <VariantPlots />
		   </div>)
    }

    return (
	    <div>{content}</div>
    )
}
