import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Dots (props) {

    const center = props.center,
        dataVisible = props.dataVisible,
        dataSelected = props.dataSelected,
        currentFill = props.currentFill,
        fill = props.fill,
        dataPolygon = props.dataPolygon,
        dataInspection = props.dataInspection,
        setDataInspection = props.setDataInspection,
        // inconsistent = props.inconsistent,
        // QCfail_stroke = props.QCfail_stroke,
        // color = props.color,
        selectMode = props.selectMode,
        raise = props.raise
   
    function assignFill(datum){
        if (currentFill === 'raw') return fill.calls(datum.raw)
        else if (currentFill === 'imputed') return fill.calls(datum.imputed)
        else if (currentFill === 'sex') return fill.sex(datum.sex)
        else if (currentFill === 'manual') return fill.calls(datum.manual)
        else if (currentFill === 'exome') return fill.calls(datum.exome)
        else if (currentFill === 'excluded') return fill.qc(datum.excluded)
    }

    function assignDotToSelection(datum,yes,no){
        if (dataPolygon.length > 2) {
            if (d3.polygonContains(dataPolygon, [center.x(datum.intensity_ref), center.y(datum.intensity_alt)])) return yes
            else return no
        } else return no
    }

    // function assignStrokeColor(datum, yes, no){
    //     if (!inconsistent && !QCfail_stroke) return no
    //     else if (inconsistent && datum.raw !== -1 && datum.raw !== datum.imputed) return yes
    //     else if (QCfail_stroke && datum.excluded) return yes
    //     else return no
    // }

    function assignStrokeWidth(datum,yes,no) {
        if (dataSelected.length === 0 && !selectMode[0]) return no
        else if (dataSelected.map(el => el.FINNGENID).includes(datum.FINNGENID)) return yes
        else if (selectMode[0] && dataPolygon.length > 2) {
            if (d3.polygonContains(dataPolygon, [center.x(datum.intensity_ref), center.y(datum.intensity_alt)])) return yes
            else return no
        } 
        else return no
    }

    function assignDotToLower(datum) {
        // if (inconsistent && datum.raw !== -1 && datum.raw !== datum.imputed) return false
        if (currentFill === 'excluded') {
            if (datum.excluded === 1) return false
            else return true
        } else if (currentFill === 'sex') {
            if (datum.sex === 'female' || datum.sex === 'male') return false
            else return true
        } else {
            if (datum[currentFill] > -1) return false
            else return true
        }
    }

    function assignDotToRaise(datum) {
        if (raise !== undefined) {
            if (datum[currentFill] === raise || (typeof raise !== 'string' && isNaN(raise) && isNaN(datum[currentFill]))) return true
            else return false
        }
        else if (datum.raw !== -1 && datum.raw !== datum.imputed) return true
        else if (dataSelected.length > 0 && dataSelected.map(el => el.FINNGENID).includes(datum.FINNGENID)) return true
        else return false
    }

    useEffect(()=> {

        d3.select('#g_dots').selectAll('.g_dot').data(dataVisible).join(
            function(enter){

                enter.append('circle')
                    .attr('class', 'g_dot')
                    .attr('cx', d=>center.x(d.intensity_ref))
                    .attr('cy', d=>center.y(d.intensity_alt))
                    .attr('r', 3)
                    .style('stroke', '#333')
                    .style('fill', d=>assignFill(d))
                    .style('stroke-width', d=>assignStrokeWidth(d,'1.8px','0.6px'))
                    .classed('g_dot_polygon', d=>assignDotToSelection(d,true,false))
                    .classed('g_dots_lower', d=>assignDotToLower(d))
                    .classed('g_dots_raise', d=>assignDotToRaise(d))
                    .on('click', (e, d)=> setDataInspection(d))
            },
            function(update){

                update
                    .attr('cx', d=>center.x(d.intensity_ref))
                    .attr('cy', d=>center.y(d.intensity_alt))
                    .style('fill', d=>assignFill(d))
                    .style('stroke-width', d=>assignStrokeWidth(d,'1.8px','0.6px'))
                    .classed('g_dots_polygon', d=>assignDotToSelection(d,true,false))
                    .classed('g_dots_lower', d=>assignDotToLower(d))
                    .classed('g_dots_raise', d=>assignDotToRaise(d))
                    .on('click', (e,d)=>setDataInspection(d))
            }   
        )
        
        d3.selectAll('.g_dots_lower').lower()
        d3.selectAll('.g_dots_raise').raise()

    })


    return (
        <>
            <g id="g_dots"></g>
            {dataInspection && (<g id="g_inspected_dot">
                <circle 
                    id="g_inspection_dot"
                    cx={center.x(dataInspection.intensity_ref)}
                    cy={center.y(dataInspection.intensity_alt)}
                    r={3}
                    />
            </g>)}
        </>
    )
}

export default Dots;
