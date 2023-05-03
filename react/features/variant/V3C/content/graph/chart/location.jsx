import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Location (props) {

    const center = props.center,
        chartSize = props.chartSize,
        dataLocation = props.dataLocation

    return (
        <g id="g_location">
            <line 
                className="g_location_line"
                x1={center.x(dataLocation.intensity_ref)}
                x2={center.x(dataLocation.intensity_ref)}
                y1={center.y(dataLocation.intensity_alt)}
                y2={chartSize.axis + chartSize.margin}
            />
            <line 
                className="g_location_line"
                x1={chartSize.unit}
                x2={chartSize.unit + chartSize.margin + chartSize.axis}
                y1={center.y(dataLocation.intensity_alt)}
                y2={center.y(dataLocation.intensity_alt)}
            />
            <circle
                className="g_location_dot"
                cx={center.x(dataLocation.intensity_ref)}
                cy={center.y(dataLocation.intensity_alt)}
            />
        </g>
    )
}

export default Location;