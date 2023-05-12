import React, { Component, useEffect, useState } from 'react';
import Density from './chart/density.jsx'
import Exomes from './chart/exomes.jsx'
import Inconsistent from './chart/inconsistent.jsx'
import Axes from './chart/axes.jsx'
import Dots from './chart/dots.jsx'
import Location from './chart/location.jsx'
import Polygon from './chart/polygon.jsx'
import QC from './chart/qc.jsx'
import External from './chart/external.jsx'
import * as d3 from "d3";

function Chart (props) {

    const vRef = props.vRef,
        vAlt = props.vAlt,
        dataVisible = props.dataVisible,
        dataSelected = props.dataSelected,
        setDataSelected = props.setDataSelected,
        dataInspection = props.dataInspection,
        setDataInspection = props.setDataInspection,
        dataTotal = props.dataTotal,
        dataLocation = props.dataLocation,
        selectMode = props.selectMode,
        color = props.color,
        rename = props.rename,
        fill = props.fill,
        zoom = props.zoom,
        setZoom = props.setZoom,
        currentFill = props.currentFill,
        dataPolygon = props.dataPolygon,
        setDataPolygon = props.setDataPolygon,
        exome = props.exome,
        density = props.density,
        contentWidth = props.contentWidth,
        center = props.center,
        chartSize = props.chartSize,
        inconsistent = props.inconsistent,
        QCfail_stroke = props.QCfail_stroke,
        QCfail_overlay = props.QCfail_overlay,
        dataExternal = props.dataExternal,
        external_overlay = props.external_overlay,
        raise = props.raise

    function updatePolygon(event){
        const graphScale = (contentWidth/2-8) / chartSize.size
    
        const svg_X = document.getElementById('g_axes').getBoundingClientRect().x,
            svg_Y = document.getElementById('g_axes').getBoundingClientRect().y - 5*graphScale;

        const coo_X = (event.clientX - svg_X) / graphScale,
            coo_Y = (event.clientY - svg_Y) / graphScale
        
        const newDataPolygon = [...dataPolygon]
        newDataPolygon.push([coo_X, coo_Y]);
        setDataPolygon(newDataPolygon)
    }

    useEffect(()=> {

        d3.select('#g_svg')
            .call(d3.zoom().on("zoom", e => {
                if (!selectMode[0]) {
                    d3.select('#g_svg').style('cursor', 'grab');
                    setZoom({x: e.transform.x, y: e.transform.y, k: zoom.k})
                    setDataPolygon([])
            }}))
            .on('wheel.zoom', null);
    })


    return (
        <svg 
            id="g_svg"
            preserveAspectRatio="xMidYMid meet"
            viewBox={`0 0 ${chartSize.size} ${chartSize.size}`}
            style={{
                cursor: selectMode[0] ? 'crosshair' : 'auto',
                backgroundColor: color.lightgray
            }}
            onClick={e=>{selectMode[0] && updatePolygon(e)}}
            >
            {density.length > 0 && (<Density
                chartSize={chartSize}
                center={center}
                color={color}
                density={density}
                />
            )}
            <Axes 
                vRef={vRef}
                vAlt={vAlt}
                chartSize={chartSize}
                center={center}
                />
            <Dots 
                dataVisible={dataVisible}
                dataSelected={dataSelected}
                currentFill={currentFill}
                center={center}
                fill={fill}
                dataPolygon={dataPolygon}
                dataInspection={dataInspection}
                setDataInspection={setDataInspection}
                inconsistent={inconsistent}
                QCfail_stroke={QCfail_stroke}
                color={color}
                selectMode={selectMode}
                raise={raise}
                />
            {exome && (<Exomes
                dataTotal={dataTotal}
                center={center}
                color={color}
                />
            )}
            {inconsistent && (<Inconsistent
                dataTotal={dataTotal}
                center={center}
                color={color}
                />
            )}
            {QCfail_overlay && (<QC
                dataTotal={dataTotal}
                center={center}
                color={color}
                />
            )}
            {external_overlay && (<External
                dataExternal={dataExternal}
                center={center}
                color={color}
                />
            )}
            {dataPolygon.length > 0 && (<Polygon 
                dataPolygon={dataPolygon}
            />)}
            {dataLocation && (<Location 
                center={center}
                chartSize={chartSize}
                dataLocation={dataLocation}
            />)}
        </svg>
    )
}

export default Chart;
