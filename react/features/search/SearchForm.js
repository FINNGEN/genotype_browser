import React, { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import validator from 'validator'
import { search, setResult } from '../search/searchSlice'

export const SearchForm = () => {

	// sessionStorage.clear()
    const dispatch = useDispatch()
    const [text, setText] = useState('')
    const [clientError, setClientError] = useState(null)
    const history = useHistory()
    const result = useSelector(state => state.search.result)
    const error = useSelector(state => state.search.error)

    useEffect(() => {
	if (!result.ids) {
		return
	    }
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
			dispatch(search(`/api/v1/find/${text}`))
	    } else {
		setClientError('invalid query')
	    }
	}
    }

    var error_message = null
    if (error) {
    	if (error.status == 404){
    		error_message = 'Not found in the data.'
    	} else if (error.status == 500) {
    		error_message = 'Internal server error, let us know.'
    	} else {
    		error_message = error.message
    	}
    }

    // onKeyDown={handleSearch}
    return (
	    <div style={{display: 'flex', paddingBottom: '20px'}}>
	    <label style={{paddingRight: '10px'}}>
	    <input type="text" name="fgq_search" className="input" 
	    		onChange={handleSearchTextChange} onKeyDown={handleSearch} />
	    </label>
	    <button type="button" className="button" onClick={handleSearch}>search</button>
	    <div style={{paddingLeft: '10px', color: 'red'}}>{clientError}</div>
	    <div style={{paddingLeft: '10px', color: 'red'}}>{error && error_message}</div>
	    </div>
    )
}
