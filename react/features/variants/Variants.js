import React from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'

export const Variants = ({ match: { params } }) => {
    
    return (
	    <div>
	    <div>multiple variants found:</div>
	    <div style={{paddingTop: '10px'}}>
	    {params.variants.split(',').map(variant => <div><Link key={variant} to={`/variant/${variant}`}>{variant}</Link></div>)}
	</div>
	    <Link to={`/variant/${params.variants}`}>show genotype counts based on all variants</Link>
	    </div>
    )
}
