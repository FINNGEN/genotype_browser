import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import ReactTable from 'react-table-v6'
import { fetchData, setData } from './rangeSlice'
import { getColumns } from '../gene/GeneTable'
import { setDataType } from '../data/dataSlice'

export const Range = (props) => {

    const dispatch = useDispatch()
    const range = useSelector(state => state.range)
    const [filt, setFilt] = useState([])
    const [checked, setChecked] = useState([])
    const reactTable = useRef(null)

    useEffect(() => {
	if (range.status == 'idle') {
	    dispatch(fetchData(`/api/v1/range/${props.match.params.range}`))
	} else {
	    const stored = sessionStorage.getItem(`${props.match.params.range}`)
	    if (stored) {
			dispatch(setData(JSON.parse(stored)))
	    } else if (range.status != 'loading') {
		dispatch(fetchData(`/api/v1/range/${props.match.params.range}`))
	    }
	}
    }, [props])

    useEffect(() => {
	if (range.status == 'done') {
	    setChecked(range.data.map(d => false))
	}
    }, [range])

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
	const variants = checked.map((c, i) => c ? range.data[i].variant.replace(/:/g, '-').replace(/\/variant\//g, '') : null).filter(d => d!==null).join(',')
	window.open(`${window.location.origin}/variant/${variants}`, '_blank')
    }
    
    let content = (<div>loading...</div>)
    if (range.status == 'failed') {
	const errorMsg = range.error.status == 400 ?
	      'Bad request' :
	      range.error.status == 404 ?
	      'Variants not found in the given range.' :
	      range.error.status == 500 ?
	      'Internal server error, let us know.' :
	      `${range.error.status} oh no, something went wrong`
	content = (<div>{errorMsg}</div>)
    }
    if (range.status == 'done') {// && checked.length > 0) {
	// maybe need to get every time because checkboxes are react-controlled
	const columns = getColumns(range, checked, handleCheck, handleCheckAll)
	const numShown = (reactTable.current && reactTable.current.getResolvedState().sortedData.length) || range.data.length
	const numSelected = checked.filter(c => c).length
	content =  (
	    <div>
		<div className="header">{range.range}</div>
		<div style={{display: 'flex', paddingBottom: '10px'}}>
		<div>
		<table>
		<tbody>
		<tr><td>{range.data.length}</td><td>variant{range.data.length == 1 ? '' : 's'}</td></tr>
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
	    data={range.data}
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
