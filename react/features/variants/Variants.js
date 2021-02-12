import React from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'

export const Variants = ({ match: { params } }) => {
    const result = useSelector(state => state.search.result)
    return (
	    <div>
	    <div>multiple variants found:</div>
	    <div style={{paddingTop: '10px'}}>
	    {params.variants.split(',').map(variant => <div><Link key={variant} to={`/variant/${variant}/${params.data_type}`}>{variant}</Link></div>)}
	</div>
	    <Link to={`/variant/${params.variants}/${params.data_type}`}>show genotype counts based on all variants</Link>
	    </div>
    )
}
