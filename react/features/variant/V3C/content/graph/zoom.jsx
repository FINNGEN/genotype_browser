import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Zoom (props) {
    
    const zoom = props.zoom,
        setZoom = props.setZoom,
        setDataPolygon = props.setDataPolygon

    return (
        <div id="g_zoom_buttons"
            >
            <button 
                id='b_zoom_more' 
                className="b_zoom_controllers button_primary" 
                style={{width: '30px'}}
                onClick={()=>{setZoom({x: zoom.x, y: zoom.y, k: zoom.k*1.5}); setDataPolygon([])}}
                >+</button>
            <button 
                id='b_zoom_less' 
                className="b_zoom_controllers button_primary"
                style={{width: '30px'}}
                onClick={()=>{setZoom({x: zoom.x, y: zoom.y, k: zoom.k*0.75}); setDataPolygon([])}}
                >-</button>
            <button 
                id='b_zoom_k' 
                className="b_zoom_controllers button_primary" 
                style={{width: '64px'}}
                >x{Math.round(zoom.k*100)/100}</button>
            <button 
                id='b_zoom_reset'
                className="b_zoom_controllers button_primary"
                style={{display: (zoom.x===0 && zoom.y===0 && zoom.k===1) ? 'none' : 'block'}}
                onClick={()=>{setZoom({x: 0, y: 0, k: 1}); setDataPolygon([])}}
                >Reset zoom</button>
        </div>
    )
}

export default Zoom;