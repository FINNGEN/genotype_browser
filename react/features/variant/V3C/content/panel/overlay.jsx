import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Overlay (props) {

    const vRef = props.vRef,
        vAlt = props.vAlt,
        exome = props.exome,
        setExome = props.setExome,
        density = props.density,
        setDensity = props.setDensity,
        color = props.color,
        dataTotal = props.dataTotal,
        QCfail_overlay = props.QCfail_overlay,
        setQCfail_overlay = props.setQCfail_overlay,
        dataExternal = props.dataExternal,
        external_overlay = props.external_overlay,
        setExternal_overlay = props.setExternal_overlay,
        inconsistent = props.inconsistent,
        setInconsistent = props.setInconsistent

    const densityButtons = [
        {
            'id': 'g_raw_refref',
            'parameter': 'raw',
            'label': 0,
            'name': 'Raw ' + vRef + vRef,
            'color': color.orange,
        },
        {
            'id': 'g_raw_altref',
            'parameter': 'raw',
            'label': 1,
            'name': 'Raw ' + vRef + vAlt,
            'color': color.green,
        },
        {
            'id': 'g_raw_altalt',
            'parameter': 'raw',
            'label': 2,
            'name': 'Raw ' + vAlt + vAlt,
            'color': color.purple,
        },
        {
            'id': 'g_imputed_refref',
            'parameter': 'imputed',
            'label': 0,
            'name': 'Imputed ' + vRef + vRef,
            'color': color.orange,
        },
        {
            'id': 'g_imputed_altref',
            'parameter': 'imputed',
            'label': 1,
            'name': 'Imputed ' + vRef + vAlt ,
            'color': color.green,
        },
        {
            'id': 'g_imputed_altalt',
            'parameter': 'imputed',
            'label': 2,
            'name': 'Imputed ' + vAlt + vAlt,
            'color': color.purple,
        },
        {
            'id': 'g_sex_male',
            'parameter': 'sex',
            'label': 'male',
            'name': 'Male',
            'color': color.lightblue,
        },
        {
            'id': 'g_sex_female',
            'parameter': 'sex',
            'label': 'female',
            'name': 'Female',
            'color': color.pink,
        }
    ]

    const [densityView, setDensityView] = useState(false)

    useEffect(()=> {   

        d3.select('#p_overlay_buttons').selectAll('.button_secondary').data(densityButtons).join(
            function(enter){
                enter.append('button')
                    .html(d => d.name)
                    .attr('class', 'button_secondary')
                    .style('display', densityView ? 'block' : 'none')
                    .on('click', function(e, d){
                        const visible = d3.select(this).classed('button_secondary_active')
                        d3.select(this).classed('button_secondary_active', !visible)
                        if (visible) {
                            const newDensity = [...density].filter(el => el.id !== d.id)
                            setDensity(newDensity)
                        } else {
                            const isolines = dataTotal.filter(el => el[d.parameter] == [d.label])
                            const datum = {...d, data: isolines}
                            const newDensity = [...density]
                            newDensity.push(datum)
                            setDensity(newDensity) 
            }})},
            function(update){update.style('display', densityView ? 'block' : 'none')}
        )
    })


    return (
        <div className="panel" id="p_overlay" style={{margin: 0, borderWidth: "0.5px 0 0.5px 0"}}>
            <div className="p_container">
                <div className="p_inner">Overlay</div>
                <div className="p_buttons" id="p_overlay_buttons">
                    <button 
                        id='p_overlay_exome'
                        className={exome ? 'button_primary button_active' : 'button_primary'}
                        onClick={()=>{setExome(!exome)}}
                        >Exome</button>
                    <button 
                        id='p_overlay_inconsistent'
                        className={inconsistent ? 'button_primary button_active' : 'button_primary'}
                        onClick={()=>{setInconsistent(!inconsistent)}}
                        >Raw-imputed inconsistent</button>
                    <button 
                        id='p_overlay_qc'
                        className={QCfail_overlay ? 'button_primary button_active' : 'button_primary'}
                        onClick={()=>{setQCfail_overlay(!QCfail_overlay)}}
                        >QC fail</button>
                    {dataExternal.length > 0 && (<button 
                        id='p_overlay_external'
                        className={external_overlay ? 'button_primary button_active' : 'button_primary'}
                        onClick={()=>{setExternal_overlay(!external_overlay)}}
                        >External selection</button>)}
                    <button 
                        id='p_overlay_density'
                        className={densityView ? 'button_primary button_active' : 'button_primary'}
                        onClick={()=>{
                            densityView && d3.select('#p_overlay_buttons').selectAll('.button_secondary').classed('button_secondary_active', false)
                            densityView && setDensity([])
                            setDensityView(!densityView)
                        }}
                        >Density</button>
                </div>
            </div>
        </div>
    )
}

export default Overlay;
