import React, { Component, useEffect, useState } from 'react';
import Graph from './content/graph.jsx'
import Info from './content/info.jsx'
import Panel from './content/panel.jsx'
import * as d3 from "d3";

function Content (props) {

    const chr = props.chr,
        pos = props.pos,
        vRef = props.vRef,
        vAlt = props.vAlt,
        dataInitial = props.dataInitial,
        dataTotal = props.dataTotal,
        setDataTotal = props.setDataTotal,
        dataVisible = props.dataVisible,
        setDataVisible = props.setDataVisible,
        dataSelected = props.dataSelected,
        setDataSelected = props.setDataSelected,
        dataLocation = props.dataLocation,
        setDataLocation = props.setDataLocation,
        dataExternal = props.dataExternal,
        selectMode = props.selectMode,
        setSelectMode = props.setSelectMode,
        manual = props.manual,
        setManual = props.setManual
        

    const [contentWidth, setContentWidth] = useState(getContentWidth())

    const [currentFill, setCurrentFill] = useState('raw')
    const [exome, setExome] = useState(false)
    const [inconsistent, setInconsistent] = useState(false)
    const [QCfail_stroke, setQCfail_stroke] = useState(false)
    const [QCfail_overlay, setQCfail_overlay] = useState(false)
    const [external_overlay, setExternal_overlay] = useState(false)
    const [density, setDensity] = useState([])
    const [raise, setRaise] = useState(undefined)

    const color = {
        purple: '#d340ed',
        green: '#82c600',
        orange: '#ed7000',
        lightgray: '#ddd',
        midgray: '#AAA',
        darkgray: '#444',
        pink: '#FFC2E0',
        lightblue: '#27CFE3',
        background: '#f4f4f4',
        red: '#c60202' 
    }

    const rename = {
        calls: function(a) {
            if (a === 0) return vRef + vRef;
            else if (a === 1) return vRef + vAlt;
            else if (a === 2) return vAlt + vAlt;
            else if (a === 'male') return 'Male';
            else if (a === 'female') return 'Female';
            else return 'Null'
        },
        batch: function(a) {    
            while(a.charAt(0) === 'b') {a = a.substring(1)}
            return a
        },
        source: function(a) {
            if (a === '-1' | a === -1 | a === undefined | a === null) return 'Null'
            else {
                let b = a.replace(/_|-|\./g, " ").replace(/#/g, "")
                let c = b.replace('BIOBANK', '').replace('OF ', '').replace('  ',' ')
                return c
            }
        },
        qc: function(a) {
            if (a === 1) return 'Pass'
            else if (a === 0 ) return 'Fail'
            else return 'Null'
        },
        generic: function(a) {
            if (a === '-1' | a === -1 | a === undefined | a === null) return 'Null'
            else {
                let b = a.replace(/_|-|\./g, " ").replace(/#/g, "")
                return b
            }
        }
    }

    const fill = {
        calls: function(a) {
            if (a === 0) return color.orange
            else if (a === 1) return color.green
            else if (a === 2) return color.purple
            else return color.midgray;
        },
        sex: function(a) {
            if (a === 'male') return color.lightblue
            else if (a === 'female') return color.pink
            else return color.midgray
        },
        qc: function(a) {
            if (a === 1) return '#FFF'
            else if (a === 0) return color.red
            else return color.midgray;
        }
    }

    const d = new Date();
    let year = d.getFullYear(),
        month = d.getMonth() + 1,
        day = d.getDate(),
        hours = d.getHours(),
        minutes = d.getMinutes(),
        date = year + "-" + month + "-" + day + '_' + hours + "-" + minutes;

    function getContentWidth(){
        const elements = 250
        if (window.innerWidth / 2 + elements > window.innerHeight) return window.innerHeight + elements + 135
        else return window.innerWidth
    }

    useEffect(()=> {
        window.addEventListener('resize', () => {setContentWidth(getContentWidth())}, true)
    
    })


    return (
        <div id='content' style={{width: '100%'}}>
            <div id='display'>
                <Graph
                    chr={chr}
                    pos={pos}
                    vRef={vRef}
                    vAlt={vAlt}
                    dataInitial={dataInitial}
                    dataTotal={dataTotal}
                    dataVisible={dataVisible}
                    dataSelected={dataSelected}
                    dataLocation={dataLocation}
                    setDataTotal={setDataTotal}
                    setDataVisible={setDataVisible}
                    setDataSelected={setDataSelected}
                    setDataLocation={setDataLocation}
                    color={color}
                    rename={rename}
                    fill={fill}
                    date={date}
                    selectMode={selectMode}
                    setSelectMode={setSelectMode}
                    currentFill={currentFill}
                    exome={exome}
                    density={density}
                    contentWidth={contentWidth}
                    manual={manual}
                    setManual={setManual}
                    inconsistent={inconsistent}
                    QCfail_stroke={QCfail_stroke}
                    QCfail_overlay={QCfail_overlay}
                    dataExternal={dataExternal}
                    external_overlay={external_overlay}
                    raise={raise}
                    setRaise={setRaise}
                />
                <Info 
                    chr={chr}
                    pos={pos}
                    vRef={vRef}
                    vAlt={vAlt}
                    dataTotal={dataTotal}
                    dataVisible={dataVisible}
                    dataSelected={dataSelected}
                    setDataTotal={setDataTotal}
                    setDataVisible={setDataVisible}
                    setDataSelected={setDataSelected}
                    setDataLocation={setDataLocation}
                    color={color}
                    rename={rename}
                    fill={fill}
                    date={date}
                    manual={manual}
                    setManual={setManual}
                    selectMode={selectMode}
                    currentFill={currentFill}
                    contentWidth={contentWidth}
                />
            </div>
            <Panel 
                chr={chr}
                pos={pos}
                vRef={vRef}
                vAlt={vAlt}
                dataTotal={dataTotal}
                dataVisible={dataVisible}
                dataSelected={dataSelected}
                setDataTotal={setDataTotal}
                setDataVisible={setDataVisible}
                setDataSelected={setDataSelected}
                color={color}
                rename={rename}
                selectMode={selectMode}
                currentFill={currentFill}
                setCurrentFill={setCurrentFill}
                manual={manual}
                exome={exome}
                setExome={setExome}
                density={density}
                setDensity={setDensity}
                contentWidth={contentWidth}
                inconsistent={inconsistent}
                setInconsistent={setInconsistent}
                QCfail_stroke={QCfail_stroke}
                setQCfail_stroke={setQCfail_stroke}
                QCfail_overlay={QCfail_overlay}
                setQCfail_overlay={setQCfail_overlay}
                dataExternal={dataExternal}
                external_overlay={external_overlay}
                setExternal_overlay={setExternal_overlay}
                setRaise={setRaise}
            />
        </div>
    )
}

export default Content;
