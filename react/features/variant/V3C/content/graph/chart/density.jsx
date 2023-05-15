import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Density (props) {

    const center = props.center,
        density = props.density,
        chartSize = props.chartSize

    function getDataContours(data){
        return d3.contourDensity().x(d => center.x(d.intensity_ref)).y(d => center.y(d.intensity_alt))
        .size([chartSize.size, chartSize.size]).bandwidth(30).thresholds(30)
        (data)
    }

    useEffect(()=> {

        density.forEach(isoline => {
            d3.select('#g_density').append('g').selectAll(".g_isoline").data(getDataContours(isoline.data)).join(
                function(enter){
                    enter.append('path')
                        .attr('class', 'g_isoline')
                        .attr('fill', 'none')
                        .attr('stroke', isoline.color)
                        .attr("stroke-width", (d, i) => i % 5 ? 0.25 : 1)
                        .attr("d", d3.geoPath())
                },
                function(update){update.attr('stroke', isoline.color).attr("d", d3.geoPath())}
            )

        })

    })

    return (
        <g id="g_density"></g>
    )
}

export default Density;
