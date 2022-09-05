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

export const getColumns = (gene, checked, handleCheck, handleCheckAll) => {

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

	var gene_columns = gene.columns.filter(col => col !== 'af_nfee_genomes' && col !== 'af_nfsee_exomes')
    cols.push(...gene_columns.map(c => {
	if (c == 'variant') {
	    return {
		Header: c,
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => <Link to={props.value} target="_blank">{props.value.split('/')[2]}</Link>
	    }
	} else if (c == 'source') {
	    return {
		Header: "GT source",
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => props.value
	    }
	} else if (c == 'url') {
	    return {
		Header: c,
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => <Link to={props.value} target="_blank">{props.value.split('/')[2]}</Link>
	    }
	} else if (c == 'in_data') {
	    return {
		Header: c,
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => props.value
	    }
	} else if (c == 'rsid') {
	    return {
		Header: c,
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right'},
		Cell: props => props.value == '' ? 'NA' : props.value
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
		Cell: props => props.value == '' ? 'NA' : (props.value).toExponential(2),
		filterMethod: afFilter
	    }
	} else if (c == 'af_fin_genomes') {
	    return {
	    Header: c.replace('af_fin_', 'fin af gnomad2 '),
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right', 'whiteSpace': 'break-spaces'},
		Cell: props => props.value == '' ? 'NA' : (props.value).toExponential(2),
		filterMethod: afFilter
	    }
	} else if (c == 'af_fin_exomes') {
	    return {
	    Header: c.replace('af_fin_', 'fin af gnomad2 '),
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right', 'whiteSpace': 'break-spaces'},
		Cell: props => props.value == '' ? 'NA' : (props.value).toExponential(2),
		filterMethod: afFilter
	    }
	} else if (c == 'info') {
	    return {
		Header: c,
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'center', 'whiteSpace': 'break-spaces'},
		Cell: props => props.value == '' ? 'NA' : (props.value).toPrecision(3) ,
		filterMethod: numFilter
	    }
	} else if (c.startsWith('enrichment_nfsee') || c.startsWith('enrichment_nfee')) {
	    return {
		Header: c.replace('enrichment_nfsee_', 'fin enr gnomad2 ').replace('enrichment_nfee_', 'fin enr gnomad2 '),
		accessor: c,
		style: {textAlign: 'right'},
		headerStyle: {textAlign: 'right', 'whiteSpace': 'break-spaces'},
		Cell: props => {
			if (props.value == ''){
				return 'NA'
			} else if (props.value == 1e6 || props.value == 'inf' || props.value == 'Inf') {
				return 'inf'
			} else {
				return props.value.toPrecision(3)
			}
		},
		filterMethod: numFilter
	    }
	} 
    }))
    return cols
}
