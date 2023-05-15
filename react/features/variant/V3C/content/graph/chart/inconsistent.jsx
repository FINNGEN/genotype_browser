import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Inconsistent (props) {

    const center = props.center,
        color = props.color,
        dataTotal = props.dataTotal

    const dataInconsistent = dataTotal.filter(el => el.raw > -1 && el.raw !== el.imputed)

    useEffect(()=> {

        if (dataInconsistent.length > 0){
            d3.select('#g_inconsistent').selectAll('.g_inconsistent').data(dataInconsistent).join(
                function(enter){
                    enter.append('circle')
                        .attr('cx', d=>center.x(d.intensity_ref))
                        .attr('cy', d=>center.y(d.intensity_alt))
                        .attr('r', 1.5)
                        .attr('fill', '#0000ff')
                        .attr('class', 'g_inconsistent')
                },
                function(update){
                    update
                        .attr('cx', d=>center.x(d.intensity_ref))
                        .attr('cy', d=>center.y(d.intensity_alt))
        })}
    })


    return (
        <g id="g_inconsistent"></g>
    )
}

export default Inconsistent;
