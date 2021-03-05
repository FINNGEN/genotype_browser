import React from 'react'
import { Link } from 'react-router-dom'
import { useHistory } from 'react-router-dom'
import { search } from '../search/searchSlice'
import { useSelector, useDispatch } from 'react-redux'


export const SearchExamples = () => {

	// <Link to='/variant/13-32315226-G-A'> rs3092989 
	// <Link to='/variant/12-71584145-G-T'> rs200138614 
 	const dtype = useSelector(state => state.search.data_type)
 	
    return (
	    <div>
	    <span>Examples: 
	    	<Link to= {'/variant/12-71584145-G-T/' + dtype} > rs200138614, </Link> 
	    	<Link to= {'/variant/2-37722017-T-C/' + dtype} > 2-37722017-T-C, </Link> 
	    	<Link to= {'/gene/PALB2/' + dtype} > PALB2, </Link>
	    	<Link to= {'/variant/16-23634953-CA-C,22-28695868-AG-A/' + dtype} > rs180177102,rs555607708, </Link>
	    	<Link to= {'/range/22:42126499-42130881/' + dtype} > 22:42126499-42130881 </Link>
	    </span>
	    </div>
    )
}
