import React, { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import validator from 'validator'
import { search } from '../search/searchSlice'

export const SearchForm = () => {

	var dtype_init = sessionStorage.getItem('data_type')
	if (dtype_init == undefined){
		dtype_init = 'imputed'
	}

    const dispatch = useDispatch()
    const [text, setText] = useState('')
    const [clientError, setClientError] = useState(null)
    const [dtype, setType] = useState(dtype_init)
    const history = useHistory()
    const result = useSelector(state => state.search.result)
    const error = useSelector(state => state.search.error)

    //sessionStorage.clear()

    useEffect(() => {
	if (!result.ids) return
	if (result.ids.length==1) {
	    if (result.type == 'variant') {
		history.push(`/variant/${result.ids[0]}`)
	    }
	    if (result.type == 'gene') {
		history.push(`/gene/${result.ids[0]}`)
	    }
	    if (result.type == 'range') {
	    	history.push(`/range/${result.query}`)
	    }
	} else if (result.ids.length > 1) {
	    if (result.type == 'variant') {
		history.push(`/variants/${result.ids.join(',')}`)
	    }
	}
    }, [result, error])

    const handleSearchTextChange = event => {
	setText(event.target.value.trim())
    }

    const handleSearch = event => {
	if (!event.key || event.key == 'Enter') {
	    if (validator.matches(text, /^[A-Z|a-z|0-9|\-|_|:,]+$/)) {
		setClientError(null)
		dispatch(search(`/api/v1/find/${text}?` + new URLSearchParams({...{'data_type': dtype}}) ))
	    } else {
		setClientError('invalid query')
	    }
	}
    }

    const handleDataTypeChange = event => {
    	setType(event.target.value)
    }

    return (
	    <div style={{display: 'flex', paddingBottom: '20px'}}>
	    <label style={{paddingRight: '10px'}}>
	    <input type="text" name="fgq_search" className="input" onChange={handleSearchTextChange} onKeyDown={handleSearch} />
	    </label>
	    <div style={{paddingRight: '10px'}}>
	    <input type="radio" value="imputed" id="imputed" name="dtype" checked = {dtype == 'imputed' ? "checked" : ""} onChange={handleDataTypeChange} />
	    <label>imputed</label>
		<input type="radio" value="chip" id="chip" name="dtype" checked = {dtype == 'chip' ? "checked" : ""}  onChange={handleDataTypeChange} />
	    <label>chip</label>
	    </div>
	    <button type="button" className="button" onClick={handleSearch}>search</button>
	    <div style={{paddingLeft: '10px'}}>{clientError}</div>
	    <div style={{paddingLeft: '10px'}}>{error && error.message}</div>
	    </div>
    )
}
