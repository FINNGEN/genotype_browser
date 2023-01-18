import React from 'react'
import { Link } from 'react-router-dom'
import { resetSearch } from '../search/searchSlice'
import { resetData } from '../data/dataSlice'
import { useDispatch } from 'react-redux'

export const SearchExamples = () => {
 	
	const dispatch = useDispatch()
	const reset = () => {
		dispatch(resetSearch())
		dispatch(resetData())
	}

    return (
	    <div>
	    <span>Examples: 
	    	<Link to= {'/variant/12-71584145-G-T/'} onClick={reset}> rs200138614, </Link> 
	    	<Link to= {'/variant/2-37722017-T-C/'} onClick={reset} > 2-37722017-T-C, </Link> 
	    	<Link to= {'/gene/PALB2/'} onClick={reset} > PALB2, </Link>
	    	<Link to= {'/variant/16-23634953-CA-C,22-28695868-AG-A/'} onClick={reset} > rs180177102,rs555607708, </Link>
	    	<Link to= {'/range/22:42126499-42130881/'} onClick={reset} > 22:42126499-42130881 </Link>
	    </span>
	    </div>
    )
}
