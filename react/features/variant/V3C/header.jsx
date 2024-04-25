import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";
import logo from '../../../public/img/v3c_logo_small.svg' 

function Header (props) {

    const chr = props.chr,
        pos = props.pos,
        vRef = props.vRef,
        vAlt = props.vAlt,
        selectMode = props.selectMode,
        manual = props.manual
    
    useEffect(()=> {

        d3.select('v3c-body').style('background-color', '#EEE');
        
        d3.select('#h_external')
            .on('mouseenter', ()=>d3.select('#h_external_alert').style('display', 'block'))
            .on('mouseleave', ()=>d3.selectAll('#h_external_alert, #h_external_error').style('display', 'none'));

        d3.select('#h_reset')
            .on('mouseenter', ()=>d3.select('#h_reset_alert').style('display', 'block'))
            .on('mouseleave', ()=>d3.select('#h_reset_alert').style('display', 'none'));

    })

    return (
        <div id="header" style={{opacity: selectMode[0] ? 0.3 : 1, pointerEvents: selectMode[0] ? 'none' : 'auto'}}>
            <div id="h_container">
                <div id="h_logo">
                    <img src={logo} width="20px" />
                </div>
                <div id="h_description">
                    <p>Chromosome: <b>{chr}</b>&nbsp;&nbsp;&nbsp;Position: <b>{pos}</b>&nbsp;&nbsp;&nbsp;Reference: <b>{vRef}</b>&nbsp;&nbsp;&nbsp;Alternative: <b>{vAlt}</b></p>
                </div>
            </div>
            
            <div id="h_buttons">
                <div className='flex-container'>
                    <p>How are samples selected for cluster plot</p>
                    <a className='tooltip-center'>
                    <div className='tooltip-icon'>?</div>
                    <span>
                        The subset of samples is selected so that from each separate genotyping batch if there are less than 10 
                        of either homozygous calls (ref or alt), then maximum of 100 samples are sampled from each homozygous 
                        refs and alts and all samples with heterozygous calls are left, else maximum of 100 samples are sampled 
                        per call category. Genotypes with a missing call are all selected. In addition, genotypes with external 
                        exome sequencing calls available (N = 1069) are always selected.
                    </span>
                    </a>
                </div>
                <div id="h_external">
                    <input id="b_external" type="file" className="inputfile"/>                    
                    <label className='v3c-label' htmlFor="b_external">Upload external selection</label>
                    <div id="h_external_alert" className="h_alert">Upload only TSV files with an "ID" or "FINNGENID" column.</div>
                    <div id="h_external_error" className="h_alert">Some errors occurred. Please, check the console.</div>
                </div>
                <div id="h_reset" style={{display: manual ? 'block' : 'none'}}>
                    <button id='b_reset' className="button_white">Reset dataset</button>
                    <div id="h_reset_alert" className="h_alert">Cancel manual edititing and restore dataset to original state.</div>
                </div>
                
            </div>
        </div>
    )
}

export default Header;