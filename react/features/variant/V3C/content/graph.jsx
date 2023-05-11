import React, { Component, useEffect, useState } from 'react';
import Count from './mutual/count.jsx'
import Chart from './graph/chart.jsx'
import Zoom from './graph/zoom.jsx'
import Inspection from './graph/inspection.jsx'
import Alert from './graph/alert.jsx'
import * as d3 from "d3";

function Graph (props) {
    
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
        color = props.color,
        rename = props.rename,
        fill = props.fill,
        selectMode = props.selectMode,
        setSelectMode = props.setSelectMode,
        currentFill = props.currentFill,
        exome = props.exome,
        density = props.density,
        contentWidth = props.contentWidth,
        manual = props.manual,
        setManual = props.setManual,
        inconsistent = props.inconsistent,
        QCfail_stroke = props.QCfail_stroke,
        QCfail_overlay = props.QCfail_overlay,
        dataExternal = props.dataExternal,
        external_overlay = props.external_overlay,
        raise = props.raise,
        setRaise = props.setRaise

    const [dataInspection, setDataInspection] = useState()
    const [dataPolygon, setDataPolygon] = useState([])
    const [zoom, setZoom] = useState({x: 0, y: 0, k: 1})
    const [exportView, setExportView] = useState(false)

    const chartSize = {
        size: 600,
        margin: 8,
        unit: 600/12,
        axis: 600 - 8 - 600/12,
    }

    const extentRef = d3.extent(dataTotal, d => d.intensity_ref),
        extentAlt = d3.extent(dataTotal, d => d.intensity_alt)
    
    var zoom_extentRef = [(extentRef[0] + zoom.x) / zoom.k, (extentRef[1] + zoom.x) / zoom.k],
        zoom_extentAlt = [(extentAlt[0] + zoom.y) / zoom.k, (extentAlt[1] + zoom.y) / zoom.k]
    
    if (zoom_extentRef[0] < 1) zoom_extentRef[0] = 1;
    if (zoom_extentAlt[0] < 1) zoom_extentAlt[0] = 1;
    
    const center = {
        x: d3.scaleLog().domain(zoom_extentRef).range([chartSize.unit, chartSize.axis + chartSize.unit]),
        y: d3.scaleLog().domain(zoom_extentAlt).range([chartSize.axis, chartSize.margin]),
    }

    function updateDataSelected(){
        const newDataSelected = [...dataSelected]
        d3.selectAll('.g_dots_polygon').each(d => {
            if (!dataSelected.map(el => el.FINNGENID).includes(d.FINNGENID))
            newDataSelected.push(d)
        });
        setDataSelected(newDataSelected)
    }

    function exportChartSVG(){
        const svg = document.querySelector('#g_svg').cloneNode(true);
        document.body.appendChild(svg);
        svg.setAttribute('width', svg.getBoundingClientRect().width)
        svg.setAttribute('height', svg.getBoundingClientRect().height + 20)
        svg.setAttribute('class', 'transparent')

        const source = new XMLSerializer().serializeToString(svg);
        const image = `data:image/svg+xml,${encodeURIComponent(source)}`

        const link = document.getElementById("a_export_chart_svg")
        link.setAttribute("href", image);
        link.setAttribute("download", "chart_" + chr + "_" + pos + "_" + vRef + "_" + vAlt + "_export_"+ props.date + ".svg");
    }

    function exportChartJPG(){
        const svg = d3.select("#g_svg").attr('width', '2000px').attr('height', '2000px').node();
        const width = svg.getBoundingClientRect().width,
            height = svg.getBoundingClientRect().height;
        
        var source = new XMLSerializer().serializeToString(svg);
        if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
        
        /* eslint-disable-next-line no-restricted-globals */
        var DOMURL = self.URL || self.webkitURL || self.mozURL || self;

        const img = new Image();
        const svgAbs = new Blob([source], {type: "image/svg+xml"});
        const url = DOMURL.createObjectURL(svgAbs);

        img.onload = function() {
            let canvas = document.createElement('canvas')
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");
            context.drawImage(img, 0, 0);
            const image = canvas.toDataURL("image/jpeg", 1);

            const link = document.getElementById("a_export_chart_jpg")
            link.setAttribute("href", image)
            link.setAttribute("download", "chart_" + chr + "_" + pos + "_" + vRef + "_" + vAlt + "_export_" + props.date + ".jpg")
        };
        img.src = url;
        d3.select("#g_svg").attr('width', undefined).attr('height', undefined)
    }

    useEffect(()=> {

        d3.select('#b_reset')
            .on('click', function(){
                setDataSelected([]);
                setDataTotal([...dataInitial]);
                setDataVisible([...dataInitial]);
                setDataLocation()
                setZoom({x: 0, y: 0, k: 1});
                setManual(false);
            })

        d3.select('#graph')
            .on('mouseenter', ()=>{!selectMode[0] && d3.selectAll('.b_zoom_controllers').style('opacity', '1');})
            .on('mouseleave', ()=>{d3.selectAll('.b_zoom_controllers').style('opacity', '0');})

        d3.select('#b_selection_new')
            .classed('button_active', selectMode[1]==='new')
            .html(selectMode[1]==='new' ? 'Confirm selection' : 'New selection')
            .on("click", function(){
                if (selectMode[0]) {
                    d3.select('#b_selection_undo').classed('transparent', true);
                    d3.select('#b_selection_filtered').classed('transparent', false);
                    d3.select('#b_selection_add').classed('transparent', false);
                    d3.select('#b_export_chart').classed('transparent', false);

                    updateDataSelected()
                    setSelectMode([false, undefined])
                } else {
                    d3.select('#b_selection_undo').classed('transparent', false)
                    d3.select('#b_selection_filtered').classed('transparent', true);
                    d3.select('#b_selection_add').classed('transparent', true);
                    d3.select('#b_export_chart').classed('transparent', true);

                    setSelectMode([true, 'new']);
                    setDataSelected([]);
                    setDataPolygon([]);
        }})

        d3.select('#b_selection_add')
            .classed('button_active', selectMode[1]==='add')
            .classed('transparent', dataSelected.length === 0 || dataVisible.length === dataSelected.length )
            .html(selectMode[1]==='add' ? 'Add selected dots' : 'Add dots')
            .on("click", function(){
                if (selectMode[0]) {
                    d3.select('#b_selection_new').classed('transparent', false)
                    d3.select('#b_selection_undo').classed('transparent', true)
                    d3.select('#b_selection_filtered').classed('transparent', false)
                    d3.select('#b_export_chart').classed('transparent', false);

                    updateDataSelected()
                    setSelectMode([false, undefined])
                } else {
                    d3.select('#b_selection_new').classed('transparent', true)
                    d3.select('#b_selection_undo').classed('transparent', false)
                    d3.select('#b_selection_filtered').classed('transparent', true)
                    d3.select('#b_export_chart').classed('transparent', true);

                    setSelectMode([true, 'add']);
                    setDataPolygon([]);
            }})

        d3.select('#b_selection_filtered')
            .classed('transparent', selectMode[0] || dataVisible.length === dataSelected.length)
            .on("click",function(){
                setZoom({x: 0, y: 0, k: 1})
                setDataSelected([...dataVisible]);
                setDataPolygon([])
            })

        d3.select('#b_selection_undo')
            .classed('transparent', !selectMode[0])
            .on('click', function(){
                setDataPolygon([])
                setSelectMode([false, undefined])

                d3.select('#b_selection_new').classed('transparent', false)
                d3.select('#b_selection_add').classed('transparent', dataSelected.length === 0 || dataVisible.length === dataSelected.length)
            })
    })


    return (
        <div id="graph" style={{width: contentWidth/2}}>
            <div className="heading button">
                <button id='b_selection_new' className='button_primary button_fixed-width'>New selection</button>
                <button id='b_selection_add' className='button_primary'>Add dots</button>
                <button id='b_selection_filtered' className='button_primary'>Select all filtered dots</button>
                <a id='a_export_chart_svg'
                    style={{display: exportView ? 'block' : 'none', float: 'right', marginRight: 0}}
                    onClick={()=>{exportChartSVG()}}
                    ><button 
                            id='b_export_chart_svg' 
                            style={{float: 'right'}}
                            type="submit"
                            className='button_secondary'
                    >SVG</button>
                </a>
                <a id='a_export_chart_jpg'
                    style={{display: exportView ? 'block' : 'none', float: 'right'}}
                    onClick={()=>{exportChartJPG()}}
                    ><button 
                            id='b_export_chart_jpg' 
                            style={{float: 'right'}}
                            type="submit"
                            className='button_secondary'
                    >JPG</button>
                </a>
                <button
                    id='b_export_chart'
                    style={{float: 'right', marginRight: exportView ? '4px' : '0'}}
                    className={exportView ? 'button_primary button_active' : 'button_primary'}
                    onClick={()=>{setExportView(!exportView)}}
                    >{exportView ? '✕' : 'Export chart'}
                    </button>
                <button id='b_selection_undo' className='button_primary' style={{float: 'right'}}>Undo selection</button>
            </div>
            <Count 
                destination={'graph'}
                data={dataVisible}
                currentFill={currentFill}
                rename={rename}
                fill={fill}
                selectMode={selectMode}
                raise={raise}
                setRaise={setRaise}
            />
            <div id="g_info">
                <Alert 
                    dataTotal={dataTotal}
                    currentFill={currentFill}
                    selectMode={selectMode}
                    rename={rename}
                    />
                <Zoom 
                    zoom={zoom}
                    setZoom={setZoom}
                    setDataPolygon={setDataPolygon}
                />
            </div>
            <Chart
                vRef={vRef}
                vAlt={vAlt}
                dataTotal={dataTotal}
                dataVisible={dataVisible}
                dataLocation={dataLocation}
                dataInspection={dataInspection}
                currentFill={currentFill}
                dataSelected={dataSelected}
                setDataSelected={setDataSelected}
                selectMode={selectMode}
                fill={fill}
                zoom={zoom}
                setZoom={setZoom}
                color={color}
                dataPolygon={dataPolygon}
                setDataPolygon={setDataPolygon}
                setDataInspection={setDataInspection}
                exome={exome}
                density={density}
                contentWidth={contentWidth}
                center={center}
                chartSize={chartSize}
                inconsistent={inconsistent}
                QCfail_stroke={QCfail_stroke}
                QCfail_overlay={QCfail_overlay}
                dataExternal={dataExternal}
                external_overlay={external_overlay}
                raise={raise}
            />
            {dataInspection && (<Inspection 
                vRef={vRef}
                vAlt={vAlt}
                dataInspection={dataInspection}
                setDataInspection={setDataInspection}
                dataSelected={dataSelected}
                setDataSelected={setDataSelected}
                center={center}
                rename={rename}
                fill={fill}
                manual={manual}
            />)}
        </div>
    )
}

export default Graph;