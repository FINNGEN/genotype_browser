import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setFilter, setServerOption } from '../data/dataSlice'
import { setDataType } from '../search/searchSlice'
import validator from 'validator'
import './styles.css'

export const VariantForm = (props) => {

    const dispatch = useDispatch()
    const filters = useSelector(state => state.data.filters)
    const annotation = useSelector(state => state.data.annotation)
    const variants = useSelector(state => state.data.variants)
    const write_status = useSelector(state => state.data.write_status)
    const write_result = useSelector(state => state.data.write_result)
    const [gp, setGP] = useState(filters.gpThres)

    // update state if variant was open in a separate window and thus the
    // data type is obtained from the url params
    var dtype = props.props.data_type
    const source = dtype == 'imputed' ? 'Imputed data' : 'Raw chip data'
    useEffect(() => {
		dispatch(setDataType({content: dtype}))
    }, [])

    const search_status =  useSelector(state => state.search.status)
    const filterChanged = (filt, value, event) => {
	if (event.target.type !== 'text') {
	    if (filt == 'gtgp') {
		if (!(+gp>=0 && +gp<=1)) {
		    alert('gp threshold should be between 0 and 1')
		} else {
		    dispatch(setFilter({filt: filt, content: {type: value, gpThres: value == 'gt' ? 0.95 : +gp}}))
		}
	    } else {
		dispatch(setFilter({filt: filt, content: value}))
	    }
	}
    }

    const gpThresChanged = event => {
	setGP(event.target.value.trim())
    }

    const hethomChanged = event => {
	dispatch(setServerOption({opt: 'hethom', content: event.target.checked}))
    }

    const downloadRequested = event => {
		window.open(`/api/v1/write_variants/${variants.join(',')}?${new URLSearchParams(Object.assign({}, filters, {'data_type': dtype}))}`, "_blank")
    }

    const hethom = variants && variants.length > 1 ?
	  <div>
	  <input type='checkbox' onChange={hethomChanged.bind(this)} />
	  <span>count individuals heterozygous for more than one variant as homozygous</span>
	  </div> : null

    const rsid_tag = annotation && annotation[0].rsid != 'NA' ?
	  <span>{annotation[0].rsid}</span> :
	  null
    
    const gene_tag = annotation && annotation[0].gene_most_severe != 'NA' ?
	  <span>{annotation[0].gene_most_severe}</span> :
	  null

    const enr_exomes = annotation && annotation.length == 1 ?
	  annotation[0].enrichment_nfsee_exomes == 'NA' ?
	  'NA' :
	  annotation[0].enrichment_nfsee_exomes == 1e6 || annotation[0].enrichment_nfsee_exomes == 'Inf' || annotation[0].enrichment_nfsee_exomes == 'inf' ?
	  'inf' :
	  annotation[0].enrichment_nfsee_exomes.toPrecision(3) :
	  null

    const enr_genomes = annotation && annotation.length == 1 ?
	  annotation[0].enrichment_nfsee_genomes == 'NA' ?
	  'NA' :
	  annotation[0].enrichment_nfsee_genomes == 1e6 || annotation[0].enrichment_nfsee_genomes == 'Inf' || annotation[0].enrichment_nfsee_genomes == 'inf'?
	  'inf' :
	  annotation[0].enrichment_nfsee_genomes.toPrecision(3) :
	  null

	const annotation_info = annotation != undefined ?
		annotation[0].info == 'NA' ? 'NA': annotation[0].info.toPrecision(3)
	: null

	var af = ''
	if (annotation != undefined) {
		if ('af' in annotation[0]){
			const annotation_af = annotation[0].af == 'NA' ? 'NA': annotation[0].af.toPrecision(3)
			af = (
				<span>{annotation_af}</span>
			)
		}
		else {
			const annotation_af_genomes = annotation[0].af_genomes == 'NA' ? 'NA': annotation[0].af_genomes.toPrecision(3)
			const annotation_af_exomes = annotation[0].af_exomes == 'NA' ? 'NA': annotation[0].af_exomes.toPrecision(3)
			af = (
			 	<span style={{paddingLeft: '20px'}}>fin af gnomad2 genomes/exomes {annotation_af_genomes}/{annotation_af_exomes}</span>
			)
		}
	}

	const hide_imputchip_radio = dtype != undefined ?
		dtype == 'chip' ? true : false
	: false

	var render_imputchip_radio = ''
	if (!hide_imputchip_radio){
		render_imputchip_radio = (
		<div style={{display: 'flex', flexDirection: 'column'}}>
		<div><b>Genotyping method</b></div>
	    	<div style={{display: 'flex', flexDirection: 'row'}}>
		    	<div className="buttonGroup">
				<div>
			    <input type="radio" value="all" disabled={(variants && variants.length > 1)} name="impchip" checked={filters.impchip == 'all'} onChange={filterChanged.bind(this, 'impchip', 'all')}/>
			    <span>show all</span>
			    </div>
			    <div>
			    <input type="radio" value="imp" disabled={(variants && variants.length > 1)} name="impchip" checked={filters.impchip == 'imp'} onChange={filterChanged.bind(this, 'impchip', 'imp')}/>
			    <span>show only imputed</span>
			    </div>
			    <div>
			    <input type="radio" value="chip" disabled={(variants && variants.length > 1)} name="impchip" checked={filters.impchip == 'chip'} onChange={filterChanged.bind(this, 'impchip', 'chip')}/>
			    <span>show only directly genotyped</span>
			    </div>
			    </div>
			</div>
		</div>
		)
	}

	var render_gt_filtering_radio = ''
	if (!hide_imputchip_radio){
		render_gt_filtering_radio = (
			<div style={{display: 'flex', flexDirection: 'column'}}>
		    <div><b>Imputed genotype probability</b></div>
		    <div style={{display: 'flex', flexDirection: 'row'}}>
			    <div className="buttonGroup">
				    <div>
				    <input type="radio" value="gt" name="gtgp" checked={filters.gtgp == 'gt'} onChange={filterChanged.bind(this, 'gtgp', 'gt')} />
				    <span>most probable genotype</span>
				    </div>
				    <div style={{display: 'flex'}}>
				    <div>
				    <input type="radio" value="gp" name="gtgp" checked={filters.gtgp == 'gp'} onChange={filterChanged.bind(this, 'gtgp', 'gp')}/>
				    <span>gp threshold</span>
				    <input onChange={gpThresChanged} type="text" value={gp} className='input' style={{marginLeft: '10px', width: '42px'}} name="gp_thres" />
				    <button type="button" className="button" style={{width: '50px', marginLeft: '10px'}} onClick={filterChanged.bind(this, 'gtgp', 'gp')}>apply</button>
				    </div>
				    </div>
			    </div>
			</div>
			</div>
		)
	}
	
	const anno = annotation && annotation.length == 1 ?
	<div style={{display: "flex", flexDirection: "column"}}>
		<div><h3 style={{marginTop: "10px", marginBottom: "10px"}}>Variant annotation</h3></div>
			<div>
			<table className="anno">
				<thead>
				<tr>
					<th>rsid</th>
					<th>GT source</th>
					<th>Gene most severe</th>
					<th>Concequence most severe</th>
					<th>AF</th>
					<th>Info</th>
					<th>Fin enr gnomad2 genomes/exomes</th>
				</tr>
				</thead>
				<tbody>
				<tr>
					<td>{rsid_tag}</td>
					<td>{source}</td>
					<td>{gene_tag}</td>
					<td>{annotation[0].most_severe.replace(/_/g, ' ')}</td>
					<td>{af}</td>
					<td>{annotation_info}</td>
					<td>{enr_genomes}/{enr_exomes}</td>
				</tr>
				</tbody>
			</table>
			</div>

	</div> : null

	var render_content = (

		<div>
		<div><h3>{props.props['variant'] || '...'}</h3></div>
		<div style={{marginTop: "10px"}}>
			    {anno}
			    <div style={{display: 'flex', marginTop: "30px"}}>
			    <div style={{display: 'flex', flexShrink: 0}}>

			    <div style={{display: 'flex', flexDirection: 'column'}}>
			    <div><h3 style={{marginBottom: "10px", marginTop: "0px"}}>Sample filter</h3></div>
			    <div className="hl" style={{width: "100%", borderTop: "1px solid #dddddd", marginTop: "0px", marginBottom: "10px"}}></div>
			    <div style={{display: 'flex', flexDirection: 'column'}}>

			    	<div><b>Include individuals</b></div>

			    	<div style={{display: 'flex', flexDirection: 'row'}}>
				    <div className="buttonGroup">
				    <div>
					    <input type="radio" value="all" name="alive" checked={filters.alive == 'all'} onChange={filterChanged.bind(this, 'alive', 'all')} />
					    <span>all</span>
					    </div>
					    <div>
					    <input type="radio" value="alive" name="alive" checked={filters.alive == 'alive'} onChange={filterChanged.bind(this, 'alive', 'alive')} />
					    <span>alive</span>
					    </div>
				        <div>
					    <input type="radio" value="dead" name="alive" checked={filters.alive == 'dead'} onChange={filterChanged.bind(this, 'alive', 'dead')} />
					    <span>deceased</span>
					    </div>
					    </div>

					    <div className="buttonGroup">
					    <div>
					    <input type="radio" value="all" name="sex" checked={filters.sex == 'all'} onChange={filterChanged.bind(this, 'sex', 'all')} />
					    <span>all</span>
					    </div>
					    <div>
					    <input type="radio" value="female" name="sex" checked={filters.sex == 'female'} onChange={filterChanged.bind(this, 'sex', 'female')} />
					    <span>female</span>
					    </div>
					    <div>
					    <input type="radio" value="male" name="sex" checked={filters.sex == 'male'} onChange={filterChanged.bind(this, 'sex', 'male')}/>
					    <span>male</span>
					    </div>
					    </div>
				    </div>
			    
			    </div>
			    </div>

			    <div className="vl" style={{height: "100%", borderLeft: "1px solid #dddddd", marginLeft: "20px", marginRight: "20px"}}></div>

			    <div style={{display: 'flex', flexDirection: 'column'}}>
			    <div><h3 style={{marginBottom: "10px", marginTop: "0px"}}>Genotype filter</h3></div>
			    <div className="hl" style={{width: "100%", borderTop: "1px solid #dddddd", marginTop: "0px", marginBottom: "10px"}}></div>
			    <div style={{display: 'flex', flexDirection: 'row'}}>

			    	<div style={{display: 'flex', flexDirection: 'column'}}>
			    	<div><b>Chip type</b></div>
			    	<div style={{display: 'flex', flexDirection: 'row'}}>
				    	<div className="buttonGroup">
						<div>
					    <input type="radio" value="all" name="array" checked={filters.array == 'all'} onChange={filterChanged.bind(this, 'array', 'all')}/>
					    <span>all</span>
					    </div>
					    <div>
					    <input type="radio" value="finngen" name="array" checked={filters.array == 'finngen'} onChange={filterChanged.bind(this, 'array', 'finngen')}/>
					    <span>finngen chip</span>
					    </div>
					    <div>
					    <input type="radio" value="legacy" name="array" checked={filters.array == 'legacy'} onChange={filterChanged.bind(this, 'array', 'legacy')}/>
					    <span>legacy data</span>
					    </div>
					    </div>
				    </div>
				    </div>

				    {render_imputchip_radio}
				    {render_gt_filtering_radio}

			    </div>
			    </div>

			    <div className="vl" style={{height: "100%", borderLeft: "1px solid #dddddd", marginLeft: "20px", marginRight: "20px"}}></div>

			    <div style={{display: 'flex', flexDirection: 'column'}}>
			    <div><h3 style={{marginBottom: "10px", marginTop: "0px"}}>Download</h3></div>
			    <div className="hl" style={{width: "100%", borderTop: "1px solid #dddddd", marginTop: "0px", marginBottom: "10px"}}></div>
			    <div style={{display: 'flex', flexDirection: 'row'}}>
				    	<div>
					    	<input type="radio" value="all" name="hethom" checked={filters.hethom == 'all'} onChange={filterChanged.bind(this, 'hethom', 'all')} />
					    	<span>all</span>
					    </div>
					    <div>
					    	<input type="radio" value="het" name="hethom" checked={filters.hethom == 'het'} onChange={filterChanged.bind(this, 'hethom', 'het')} />
					    	<span>het</span>
					    </div>
					    <div>
					    	<input type="radio" value="hom" name="hethom" checked={filters.hethom == 'hom'} onChange={filterChanged.bind(this, 'hethom', 'hom')} />
					    	<span>hom</span>
					    </div>
					    <div>
					    	<input type="radio" value="hom" name="hethom" checked={filters.hethom == 'wt_hom'} onChange={filterChanged.bind(this, 'hethom', 'wt_hom')} />
					    	<span>WT hom</span>
					    </div>
				   	<div style={{flexShrink: 1, marginLeft: "10px"}}>
				    <button type="button" className="button" onClick={downloadRequested}>Download data</button>
				    </div>
			    </div>

			    </div>
				{hethom}
			    </div> 

			    </div>
			    </div>
		</div>
	)

     return (
    	search_status == 'failed' ? '' : render_content
    )
}
