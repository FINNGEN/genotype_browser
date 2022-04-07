import React from 'react'
import { Link } from 'react-router-dom'

const numFilter = (filter, row) => {
    const val = filter.value.trim()
    if (val.startsWith('>') || !isNaN(val)) {
	return row[filter.id] > +val.replace('>', '').trim()
    } else if (val.startsWith('<') || !isNaN(val)) {
	return row[filter.id] < +val.replace('<', '').trim()
    }
}

const afFilter = (filter, row) => {
    const val = filter.value.trim()
    if (val.startsWith('<') || !isNaN(val)) {
	return row[filter.id] < +val.replace('<', '').trim() || row[filter.id] > 1 - +val.replace('<', '').trim()
    } else if (val.startsWith('>')) {
	return row[filter.id] > +val.replace('>', '').trim() && row[filter.id] < 1 - +val.replace('>', '').trim()
    }
}

export const getColumns = (gene, checked, handleCheck, handleCheckAll, dtype) => {
    if (!gene || !gene.columns) return []
    const cols = [
	{
            Header: <div style={{cursor: 'pointer'}} onClick={handleCheckAll}>
		<span>(de)select all</span>
		</div>,
            Cell: row => (
		    <div style={{textAlign: 'center'}}>
		    <input
                type="checkbox"
		checked={checked[row.index] || false}
		onChange={() => handleCheck(row.index)}
		    />
		    </div>
            ),
            sortable: false,
            filterable: false,
	    width: 150
	}
    ]
    cols.push(...gene.columns.map(c => {
	if (c == 'variant') {
	    return {
		Header: c,
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => <Link to={`/variant/${props.value.replace(/:/g, '-')}/${dtype}`} target="_blank">{props.value}</Link>
	    }
	} else if (c == 'rsid') {
	    return {
		Header: c,
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => props.value
	    }
	} else if (c == 'most_severe') {
	    return {
		Header: 'consequence',
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => props.value.replace(/_/g, ' '),
		filterMethod: (filter, row) => {
		    if (filter.value === 'all') {
			return true
		    }
		    if (filter.value == 'coding') {
			return [
			    'transcript_ablation',
			    'splice_acceptor_variant',
			    'splice_donor_variant',
			    'stop_gained',
			    'frameshift_variant',
			    'stop_lost',
			    'start_lost',
			    'transcript_amplification',
			    'inframe_insertion',
			    'inframe_deletion',
			    'missense_variant',
			    'protein_altering_variant',
			    'splice_region_variant',
			    'incomplete_terminal_codon_variant'
			].includes(row[filter.id])
		    }
		    return row[filter.id] == filter.value
		},
		Filter: ({ filter, onChange }) =>
		    <select
		onChange={event => onChange(event.target.value)}
		value={filter ? filter.value : 'all'}
		style={{width: '100%'}}
		    >
		    <option value="all">all</option>
		    <option value="coding">coding</option>
		    <option value="missense_variant">missense</option>
		    </select>
	    }
	} else if (c == 'af') {
	    return {
		Header: c,
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => props.value == 'NA' ? 'NA' : (props.value).toExponential(2),
		filterMethod: afFilter
	    }
	} else if (c == 'af_genomes') {
	    return {
	    Header: c.replace('af_', 'fin af gnomad2 '),
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => props.value == 'NA' ? 'NA' : (props.value).toExponential(2),
		filterMethod: afFilter
	    }
	} else if (c == 'af_exomes') {
	    return {
	    Header: c.replace('af_', 'fin af gnomad2 '),
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => props.value == 'NA' ? 'NA' : (props.value).toExponential(2),
		filterMethod: afFilter
	    }
	} else if (c == 'info') {
	    return {
		Header: c,
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => props.value == 'NA' ? 'NA' : (props.value).toPrecision(3) ,
		filterMethod: numFilter
	    }
	} else if (c.startsWith('enrichment_nfsee')) {
	    return {
		Header: c.replace('enrichment_nfsee_', 'fin enr gnomad2 '),
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => {
			if (props.value == 'NA'){
				return 'NA'
			} else if (props.value == 1e6 || props.value == 'inf' || props.value == 'Inf') {
				return 'inf'
			} else {
				return props.value.toPrecision(3)
			}
		},
		filterMethod: numFilter
	    }
	} else {
	    console.error(`unexpected gene column: ${c}`)
	}
    }))
    return cols
}
