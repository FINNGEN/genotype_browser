import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Stroke (props) {

    const inconsistent = props.inconsistent,
        setInconsistent = props.setInconsistent,
        QCfail_stroke = props.QCfail_stroke,
        setQCfail_stroke = props.setQCfail_stroke

    function updateInconsistent(){
        if (QCfail_stroke && !inconsistent) setQCfail_stroke(false)
        setInconsistent(!inconsistent)
    }

    function updateQCfail_stroke(){
        if (inconsistent && !QCfail_stroke) setInconsistent(false)
        setQCfail_stroke(!QCfail_stroke)
    }

    return (
        <div className='panel' id='p_stroke'>
            <div className="p_container">
                <div className="p_inner">Stroke</div>
                <div className="p_buttons" id="p_stroke_buttons">
                    <button 
                        id='p_stroke_inconsistent'
                        className={inconsistent ? 'button_primary button_active' : 'button_primary'}
                        onClick={()=>{updateInconsistent()}}
                        >Raw-Imputed inconsistent</button>
                    <button 
                        id='p_stroke_qcfail'
                        className={QCfail_stroke ? 'button_primary button_active' : 'button_primary'}
                        onClick={()=>{updateQCfail_stroke()}}
                        >QC fail</button>
                </div>
            </div>
        </div>
    )
}

export default Stroke;