import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Polygon (props) {

    const dataPolygon = props.dataPolygon

    useEffect(()=> {

        d3.select('#g_polygon_path')
            .attr('d',`M${dataPolygon.join('L')}Z`)
            .attr('fill', '#aaa')
            .attr('stroke', 'black')
            .attr('stroke-width', '0.5px')
            .attr('opacity', '0.2');
            
        d3.select('#g_polygon_dots').selectAll('circle').data(dataPolygon).join(
            function(enter){
                enter.append('circle')
                    .attr('cx', d=>d[0])
                    .attr('cy', d=>d[1])
                    .attr('r', 2)
                    .attr('fill', '#000');
            },
            function(update){update.attr('cx', d=>d[0]).attr('cy', d=>d[1])}
        )
    
    })


    return (
        <g id="g_polygon">
            <g id="g_polygon_dots"></g>
            <path id="g_polygon_path"></path>
        </g>
    )
}

export default Polygon;