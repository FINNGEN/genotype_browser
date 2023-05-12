import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Exomes (props) {

    const center = props.center,
        color = props.color,
        dataTotal = props.dataTotal

    const dataExomes = dataTotal.filter(el => el.exome > -1);

    useEffect(()=> {

        if (dataExomes.length > 0){
            d3.select('#g_exomes').selectAll('.g_exomes').data(dataExomes).join(
                function(enter){
                    enter.append('circle')
                        .attr('cx', d=>center.x(d.intensity_ref))
                        .attr('cy', d=>center.y(d.intensity_alt))
                        .attr('r', 1.5)
                        .attr('fill', 'black')
                        .attr('class', 'g_exomes')
                },
                function(update){
                    update
                        .attr('cx', d=>center.x(d.intensity_ref))
                        .attr('cy', d=>center.y(d.intensity_alt))
        })}
    })


    return (
        <g id="g_exomes"></g>
    )
}

export default Exomes;
