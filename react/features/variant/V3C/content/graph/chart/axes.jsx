import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Axes (props) {

    const vRef = props.vRef,
        vAlt = props.vAlt,
        center = props.center,
        chartSize = props.chartSize

    const g_axis_x_translation = chartSize.size - 50,
        g_axis_y_translation = 43;


    useEffect(()=> {

        var g_axis_x = d3.axisBottom().scale(center.x).ticks(6, "~s");
        var g_axis_y = d3.axisLeft().scale(center.y).ticks(6, "~s");
        d3.select('#g_axis_x').attr('transform', 'translate(0, ' + g_axis_x_translation + ')').call(g_axis_x)
        d3.select('#g_axis_y').attr('transform', 'translate(' + g_axis_y_translation + ', 0)').call(g_axis_y)

    })


    return (
        <g id="g_axes">
            <g id="g_axis_x"></g>
            <g id="g_axis_y"></g>
            <g id="g_axis_texts">
                <text
                    x={chartSize.unit + chartSize.axis/2}
                    y={chartSize.axis + chartSize.unit/1.4 + chartSize.margin}
                    style={{
                        fontFamily: 'Arimo, Helvetica, sans-serif',
                        fontSize: '12px',
                        textAnchor: 'middle'
                    }}
                    >{vRef + ' intensity'}</text>
                <text
                    x={chartSize.unit/6}
                    y={chartSize.axis/2}
                    style={{
                        transform: 'rotate(-90deg)',
                        transformBox: 'fill-box',
                        transformOrigin: 'center',
                        fontFamily: 'Arimo, Helvetica, sans-serif',
                        fontSize: '12px',
                        textAnchor:'middle'
                    }}
                    >{vAlt + ' intensity'}</text>
            </g>
        </g>
    )
}

export default Axes;