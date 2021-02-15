import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import ReactTable from 'react-table-v6'
import { fetchData, setData } from './geneSlice'
import { getColumns } from './GeneTable'
import { setDataType } from '../search/searchSlice'

export const Gene = (props) => {

    const dispatch = useDispatch()
    const gene = useSelector(state => state.gene)
    const [filt, setFilt] = useState([])
    const [checked, setChecked] = useState([])
    const reactTable = useRef(null)

    //const columns = useMemo(() => getColumns(gene, checked, handleCheck, handleCheckAll), [gene, checked])
    var dtype = props.match.params.data_type
    useEffect(() => {
		dispatch(setDataType({content: dtype}))
    }, [])

    useEffect(() => {
	if (gene.status == 'idle') {
	    dispatch(fetchData(`/api/v1/gene_variants/${props.match.params.gene}?` + new URLSearchParams({...{'data_type': dtype}})))
	} else {
	    const stored = sessionStorage.getItem(`${props.match.params.gene}_${dtype}`)
	    if (stored) {
		    // console.log('cache hit')
	    	dispatch(setData(JSON.parse(stored)))
	    } else if (gene.status != 'loading') {
		dispatch(fetchData(`/api/v1/gene_variants/${props.match.params.gene}?` + new URLSearchParams({...{'data_type': dtype}})))
	    }
	}
    }, [props])

    useEffect(() => {
	if (gene.status == 'done') {
	    setChecked(gene.data.map(d => false))
	}
    }, [gene])

    const handleCheckAll = event => {
	const curFiltered = reactTable.current.getResolvedState().sortedData
	const c = checked.slice()
	const numSelected = curFiltered.filter(datum => c[datum._index]).length
	curFiltered.forEach(datum => {
	    c[datum._index] = numSelected != curFiltered.length
	})
	setChecked(c)
    }

    const handleCheck = index => {
	const c = checked.map((elem, i) => i == index ? !elem : elem)
	setChecked(c)
    }

    const goToVariant = event => {
	const variants = checked.map((c, i) => c ? gene.data[i].variant.replace(/:/g, '-') : null).filter(d => d!==null).join(',')
	//get won't work for a large number of variants
	//maybe put variant list to localstorage and read in the opened tab or hash variant list
	window.open(`${window.location.origin}/variant/${variants}/${dtype}`, '_blank')
    }
    
    let content = (<div>loading...</div>)
    if (gene.status == 'failed') {
	const errorMsg = gene.error.status == 400 ?
	      'Bad request' :
	      gene.error.status == 404 ?
	      'Gene not found.' :
	      gene.error.status == 500 ?
	      'Internal server error, let us know.' :
	      `${gene.error.status} oh no, something went wrong`
	content = (<div>{errorMsg}</div>)
    }
    if (gene.status == 'done') {// && checked.length > 0) {
	// maybe need to get every time because checkboxes are react-controlled
	const columns = getColumns(gene, checked, handleCheck, handleCheckAll, dtype)
	const numShown = (reactTable.current && reactTable.current.getResolvedState().sortedData.length) || gene.data.length
	const numSelected = checked.filter(c => c).length
	content =  (
	    <div>
		<div className="header">{gene.gene}</div>
		<div style={{display: 'flex', paddingBottom: '10px'}}>
		<div>
		<table>
		<tbody>
		<tr><td>{gene.data.length}</td><td>variant{gene.data.length == 1 ? '' : 's'}</td></tr>
		<tr><td style={{textAlign: 'right'}}>{numShown}</td><td>variant{numShown == 1 ? '' : 's'} shown</td></tr>
		<tr><td style={{textAlign: 'right'}}>{numSelected}</td><td>variant{numSelected == 1 ? '' : 's'} selected</td></tr>
		</tbody>
		</table>
		</div>
		<div style={{alignSelf: 'flex-end', paddingBottom: '3px', paddingLeft: '20px'}}>
		<button type="button" className="button" onClick={goToVariant} disabled={numSelected == 0 || numSelected > 10}>{numSelected <= 10 ? 'show genotype counts based on selected variants' : 'genotype counts can be shown for max 10 variants'}</button>
		</div>
		</div>
		<ReactTable
	    ref={reactTable} 
	    data={gene.data}
	    filterable
	    defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().startsWith(filter.value)}
	    onFilteredChange={filtered => { setFilt(filtered) }}
	    columns={columns}
	    defaultSorted={[{
		id: "variant",
		desc: false
	    }]}
	    defaultPageSize={15}
	    className="-striped -highlight"
		/>
		
	    </div>
	)
    }

    return <div>{content}</div>
}
