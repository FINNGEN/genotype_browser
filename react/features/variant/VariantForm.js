import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setFilter, setOption, setServerOption } from '../data/dataSlice'
import validator from 'validator'

export const VariantForm = () => {

    const dispatch = useDispatch()
    const filters = useSelector(state => state.data.filters)
    const annotation = useSelector(state => state.data.annotation)
    const variants = useSelector(state => state.data.variants)
    const write_status = useSelector(state => state.data.write_status)
    const write_result = useSelector(state => state.data.write_result)
    const [gp, setGP] = useState(filters.gpThres)
    var dtype = useSelector(state => state.search.result.data_type)
    if (dtype == undefined) {
    	dtype = sessionStorage.getItem('data_type')
    }

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

    const optionChanged = (opt, event) => {
	dispatch(setOption({opt: opt, content: event.target.value}))
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
	  <span style={{paddingLeft: '20px'}}>{annotation[0].gene_most_severe}</span> :
	  null

    const enr_exomes = annotation && annotation.length == 1 ?
	  annotation[0].enrichment_nfsee_exomes == 'NA' ?
	  'NA' :
	  annotation[0].enrichment_nfsee_exomes == 1e6 || annotation[0].enrichment_nfsee_genomes == 'Inf' ?
	  'inf' :
	  annotation[0].enrichment_nfsee_exomes.toPrecision(3) :
	  null

    const enr_genomes = annotation && annotation.length == 1 ?
	  annotation[0].enrichment_nfsee_genomes == 'NA' ?
	  'NA' :
	  annotation[0].enrichment_nfsee_genomes == 1e6 || annotation[0].enrichment_nfsee_genomes == 'Inf'?
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
				<span style={{paddingLeft: '20px'}}>af {annotation_af}</span>
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
	var render_chiptype_radio = ''
	if (!hide_imputchip_radio){
		render_imputchip_radio = (
			<div className="buttonGroup">
			<div>
		    <input type="radio" value="all" disabled={(variants && variants.length > 1)} name="impchip" checked={filters.impchip == 'all'} onChange={filterChanged.bind(this, 'impchip', 'all')}/>
		    <span>all</span>
		    </div>
		    <div>
		    <input type="radio" value="imp" disabled={(variants && variants.length > 1)} name="impchip" checked={filters.impchip == 'imp'} onChange={filterChanged.bind(this, 'impchip', 'imp')}/>
		    <span>imputed</span>
		    </div>
		    <div>
		    <input type="radio" value="chip" disabled={(variants && variants.length > 1)} name="impchip" checked={filters.impchip == 'chip'} onChange={filterChanged.bind(this, 'impchip', 'chip')}/>
		    <span>chip genotyped</span>
		    </div>
		    </div>
		)
		render_chiptype_radio = (
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
		)
	}

    const anno = annotation && annotation.length == 1 ?
	  <div style={{paddingBottom: '10px'}}>
	  {rsid_tag}
	  {gene_tag}
	  <span style={{paddingLeft: '20px'}}>{annotation[0].most_severe.replace(/_/g, ' ')}</span>
	  {af}
	  <span style={{paddingLeft: '20px'}}>info {annotation_info}</span>
	  <span style={{paddingLeft: '20px'}}>
	  fin enr gnomad2 genomes/exomes {enr_genomes}/{enr_exomes}
    </span>
	  </div> : null

    return (
	    <div>
	    {anno}
	    <div style={{display: 'flex'}}>
	    <div style={{display: 'flex', flexShrink: 0}}>
	    <div style={{display: 'flex', flexDirection: 'column'}}>
	    <div>filter</div>
	    <div style={{display: 'flex'}}>
	    <div className="buttonGroup">
	    <div>
	    <input type="radio" value="all" name="alive" checked={filters.alive == 'all'} onChange={filterChanged.bind(this, 'alive', 'all')} />
	    <span>all</span>
	    </div>
	    <div>
	    <input type="radio" value="alive" name="alive" checked={filters.alive == 'alive'} onChange={filterChanged.bind(this, 'alive', 'alive')} /><span>alive</span></div>
            <div>
	    <input type="radio" value="dead" name="alive" checked={filters.alive == 'dead'} onChange={filterChanged.bind(this, 'alive', 'dead')} />
	    <span>deceased</span>
	    </div>
            <div><input type="radio" value="unknown" name="alive" checked={filters.alive == 'unknown'} onChange={filterChanged.bind(this, 'alive', 'unknown')} /><span>unknown</span></div>
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
	    {render_chiptype_radio}
	    {render_imputchip_radio}
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
	    <div style={{display: 'flex', flexDirection: 'column', paddingLeft: '40px'}}>
	    <div>show</div>
	    <div style={{display: 'flex', flexDirection: 'row'}}>
	    <div onChange={optionChanged.bind(this, 'cntfreq')} className="buttonGroup">
	    <div><input type="radio" value="gt_count" name="cntfreq" defaultChecked/><span>number of genotypes</span></div>
	    <div><input type="radio" value="indiv_count" name="cntfreq"/><span>number of individuals</span></div>
	    <div><input type="radio" value="freq" name="cntfreq"/><span>allele frequency</span></div>
	    </div>
	    <div onChange={optionChanged.bind(this, 'bbreg')} className="buttonGroup">
	    <div><input type="radio" value="biobank" name="bbreg" defaultChecked/><span>by biobank</span></div>
	    <div><input type="radio" value="region" name="bbreg"/><span>by region of birth</span></div>
	    </div>
	    </div>
	    </div>
	    </div>

	   	<div className="buttonGroup">
	    	<div>download</div>
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
	    </div>

	    <div style={{flexShrink: 1}}>
	    <button type="button" className="button" onClick={downloadRequested}>Download data</button>
	    </div>
	    </div>
	    {hethom}
	    </div>
    )
}
