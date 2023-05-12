import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function QC(props) {

    const center = props.center,
        color = props.color,
        dataTotal = props.dataTotal

    const dataQC = dataTotal.filter(el => el.excluded === 1);

    useEffect(()=> {

        if (dataQC.length > 0){
            d3.select('#g_qc').selectAll('.g_qc').data(dataQC).join(
                function(enter){
                    enter.append('circle')
                        .attr('cx', d=>center.x(d.intensity_ref))
                        .attr('cy', d=>center.y(d.intensity_alt))
                        .attr('r', 1.5)
                        .attr('fill', color.red)
                        .attr('class', 'g_qc')
                },
                function(update){
                    update
                        .attr('cx', d=>center.x(d.intensity_ref))
                        .attr('cy', d=>center.y(d.intensity_alt))
        })}
    })


    return (
        <g id="g_qc"></g>
    )
}

export default QC;
