import React, { Component, useEffect, useState } from 'react';
import FilterV3C from './panel/filter.jsx'
import Fill from './panel/fill.jsx'
import Stroke from './panel/stroke.jsx'
import Overlay from './panel/overlay.jsx'
import * as d3 from "d3";

function Panel (props) {

    const vRef = props.vRef,
        vAlt = props.vAlt,
        dataTotal = props.dataTotal,
        dataExternal = props.dataExternal,
        dataVisible = props.dataVisible,
        setDataVisible = props.setDataVisible,
        rename = props.rename,
        currentFill = props.currentFill,
        setCurrentFill = props.setCurrentFill,
        color=props.color,
        manual = props.manual,
        exome = props.exome,
        setExome = props.setExome,
        density = props.density,
        setDensity = props.setDensity,
        inconsistent = props.inconsistent,
        setInconsistent = props.setInconsistent,
        QCfail_stroke = props.QCfail_stroke,
        setQCfail_stroke = props.setQCfail_stroke,
        QCfail_overlay = props.QCfail_overlay,
        setQCfail_overlay = props.setQCfail_overlay,
        external_overlay = props.external_overlay,
        setExternal_overlay = props.setExternal_overlay,
        setRaise = props.setRaise
    
    return (
        <div id="panel">
            <Fill 
                currentFill={currentFill}
                setCurrentFill={setCurrentFill}
                manual={manual}
                setRaise={setRaise}
                />
            {/* <Stroke 
                inconsistent={inconsistent}
                setInconsistent={setInconsistent}
                QCfail_stroke={QCfail_stroke}
                setQCfail_stroke={setQCfail_stroke}
                /> */}
            <FilterV3C
                dataTotal={dataTotal}
                dataVisible={dataVisible}
                dataExternal={dataExternal}
                setDataVisible={setDataVisible} 
                rename={rename}
                manual={manual}
                />
            <Overlay 
                vRef={vRef}
                vAlt={vAlt}
                color={color}
                exome={exome}
                setExome={setExome}
                density={density}
                setDensity={setDensity}
                dataTotal={dataTotal}
                QCfail_overlay={QCfail_overlay}
                setQCfail_overlay={setQCfail_overlay}
                dataExternal={props.dataExternal}
                external_overlay={external_overlay}
                setExternal_overlay={setExternal_overlay}
                inconsistent={inconsistent}
                setInconsistent={setInconsistent}
                />
        </div>
    )
}

export default Panel;
