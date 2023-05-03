import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function External(props) {

    const center = props.center,
        color = props.color,
        dataExternal = props.dataExternal

    useEffect(()=> {

        if (dataExternal.length > 0){
            d3.select('#g_external').selectAll('.g_external').data(dataExternal).join(
                function(enter){
                    enter.append('circle')
                        .attr('cx', d=>center.x(d.intensity_ref))
                        .attr('cy', d=>center.y(d.intensity_alt))
                        .attr('r', 1.5)
                        .attr('fill', 'white')
                        .attr('class', 'g_external')
                },
                function(update){
                    update
                        .attr('x', d=>center.x(d.intensity_ref))
                        .attr('y', d=>center.y(d.intensity_alt))
        })}
    })


    return (
        <g id="g_external"></g>
    )
}

export default External;