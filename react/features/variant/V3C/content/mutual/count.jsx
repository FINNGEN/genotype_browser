import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Count (props) {

    const destination = props.destination,
        currentFill = props.currentFill,
        data = props.data,
        rename = props.rename,
        fill = props.fill,
        raise = props.raise,
        setRaise = props.setRaise

    const dataRollup = d3.rollup(data, v => v.length, d => d[currentFill]),
        dataKeys = Array.from(dataRollup.keys()),
        dataValues = Array.from(dataRollup.values()),
        dataCount = dataKeys.map((type, index) => {return {type: type, value: dataValues[index],}});

    if (currentFill !== 'sex') {
        dataCount.sort(function(a, b){
            if (a.type < b.type) return 1;
            else if (a.type > b.type) return -1;
            else return 0;
        })
    }

    function getRename(datum, currentFill) {
        if (currentFill === 'excluded') return rename.qc(datum)
        else return rename.calls(datum)
    }

    function getFill(datum, currentFill) {
        if (currentFill === 'sex') return fill.sex(datum)
        else if (currentFill === 'excluded') return fill.qc(datum)
        else return fill.calls(datum)
    }

    function updateRaise(datum){
        console.log(datum)
        if (raise === datum) setRaise(undefined) 
        else setRaise(datum)
    }

    useEffect(()=> {
        d3.select('#'+destination).select('.count').selectAll('.count_div').data(dataCount).join(
            function(enter) {
                const countDiv = enter.append('div')
                    .attr('class', 'count_div')
                    .style('cursor', destination === 'graph' ? 'pointer' : 'auto')
                    .on('mouseenter', function(){destination === 'graph' && d3.select(this).select('.count_key').classed('count_raise_hover', true)})
                    .on('mouseleave', function(){destination === 'graph' && d3.select(this).select('.count_key').classed('count_raise_hover', false)})
                    .on('click', (e,d) => destination === 'graph' && updateRaise(d.type))

                countDiv.append('div')
                    .attr('class', 'count_circle')
                    .style('background-color', d => getFill(d.type, currentFill));
                countDiv.append('p')
                    .attr('class', 'count_key')
                    .classed('count_raise', d => destination === 'graph' && (raise === d.type || (typeof raise !== 'string' && isNaN(raise) && isNaN(d.type))))
                    .text(d=>getRename(d.type, currentFill));
                countDiv.append('p')
                    .attr('class', 'count_value')
                    .text(d=>d.value);
            },
            function(update) {
                update.on('click', (e,d) => updateRaise(d.type))
                update.select('.count_circle').style('background-color', d => getFill(d.type, currentFill));
                update.select('.count_key').classed('count_raise', d => destination === 'graph' && (raise === d.type || (typeof raise !== 'string' && isNaN(raise) && isNaN(d.type)))).text(d=>getRename(d.type, currentFill));
                update.select('.count_value').text(d=>d.value);
            }
        )

    })


    return (
        <div className="v3c-heading count">
            <p style={{
                margin: '6px 12px 0 10px',
                display: destination === 'graph' ? 'block' : 'none'
                }}>Raise</p>
        </div>
    )
}

export default Count;