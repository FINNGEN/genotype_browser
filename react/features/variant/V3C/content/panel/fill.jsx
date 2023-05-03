import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Fill (props) {

    const manual = props.manual,
        currentFill = props.currentFill,
        setCurrentFill = props.setCurrentFill,
        setRaise = props.setRaise

    const primary = [
        {name: 'Sex',       parameter: 'sex'},
        {name: 'Raw',       parameter: 'raw'},
        {name: 'QCd',       parameter: 'excluded'},
        {name: 'Imputed',   parameter: 'imputed'},
        {name: 'Exome',     parameter: 'exome'},
        {name: 'Manual',    parameter: 'manual'}
    ]

    useEffect(()=> {

        d3.select('#p_fill_buttons').selectAll('button').data(primary).join(
            function(enter) {
                enter.append('button')
                    .attr('class', d => 'button_primary ' + d.parameter)
                    .classed('button_active', d => {return currentFill === d.parameter})
                    .html(d => d.name)
                    .on('click', (e,d)=>{setCurrentFill(d.parameter); setRaise([])})
            },
            function(update) {
                update.classed('button_active', d => {return currentFill === d.parameter})
            }
        )

        d3.select('#p_fill').selectAll('.manual').style('display', manual ? 'block' : 'none')
    })


    return (
        <div className='panel' id='p_fill'>
            <div className="p_container">
                <div className="p_inner">Fill</div>
                <div className="p_buttons" id="p_fill_buttons"></div>
            </div>
        </div>
    )
}

export default Fill;