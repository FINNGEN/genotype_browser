import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Sums (props) {

    const fill = props.fill,
        manual = props.manual,
        dataSelected = props.dataSelected

    var maxima = {}

    function generateSums(parameter){
        const dataRollup = d3.rollup(dataSelected, v => v.length, d => d[parameter]),
            dataKeys = Array.from(dataRollup.keys()),
            dataValues = Array.from(dataRollup.values()),
            dataSum = dataKeys.map((type, index) => {return {type: type, value: dataValues[index],}});

        maxima[parameter] = d3.max(dataSum, d => d.value)
        return dataSum
    }

    useEffect(()=> {
            d3.select('#t_sum_count').select('p').text(()=>dataSelected.length)
            d3.select('#t_sum_ref').select('p').text(()=>d3.format(".2f")(d3.sum(dataSelected, item => item.intensity_ref) / dataSelected.length))
            d3.select('#t_sum_alt').select('p').text(()=>d3.format(".2f")(d3.sum(dataSelected, item => item.intensity_alt) / dataSelected.length))
            d3.select('#t_sum_birth').select('p').text(()=>Math.round(d3.sum(dataSelected, item => item.birth_year) / dataSelected.length))
            
            d3.select('#t_sum_raw').select('svg').selectAll('rect').data(generateSums('raw')).join(
                function(enter){
                    enter.append('rect')
                        .attr('x', 0)
                        .attr('y', (d,i)=>i*5)
                        .attr('width', d=>d.value/maxima.raw*100)
                        .attr('height', 5)
                        .attr('fill', d=>fill.calls(d.type))
                }, function(update){
                    update
                        .attr('y', (d,i)=>i*5)
                        .attr('width', d=>d.value/maxima.raw*100)
                        .attr('fill', d=>fill.calls(d.type))
                })
            
            d3.select('#t_sum_imputed').select('svg').selectAll('rect').data(generateSums('imputed')).join(
                function(enter){
                    enter.append('rect')
                        .attr('x', 0)
                        .attr('y', (d,i)=>i*5)
                        .attr('width', d=>d.value/maxima.imputed*100)
                        .attr('height', 5)
                        .attr('fill', d=>fill.calls(d.type))
                }, function(update){
                    update
                        .attr('y', (d,i)=>i*5)
                        .attr('width', d=>d.value/maxima.imputed*100)
                        .attr('fill', d=>fill.calls(d.type))
                })
            
            d3.select('#t_sum_exome').select('svg').selectAll('rect').data(generateSums('exome')).join(
                function(enter){
                    enter.append('rect')
                        .attr('x', 0)
                        .attr('y', (d,i)=>i*5)
                        .attr('width', d=>d.value/maxima.exome*100)
                        .attr('height', 5)
                        .attr('fill', d=>fill.calls(d.type))
                }, function(update){
                    update
                        .attr('y', (d,i)=>i*5)
                        .attr('width', d=>d.value/maxima.exome*100)
                        .attr('fill', d=>fill.calls(d.type))
                })
            
            d3.select('#t_sum_sex').select('svg').selectAll('rect').data(generateSums('sex')).join(
                function(enter){
                    enter.append('rect')
                        .attr('x', 0)
                        .attr('y', (d,i)=>i*5)
                        .attr('width', d=>d.value/maxima.sex*100)
                        .attr('height', 5)
                        .attr('fill', d=>fill.sex(d.type))
                }, function(update){
                    update
                        .attr('y', (d,i)=>i*5)
                        .attr('width', d=>d.value/maxima.sex*100)
                        .attr('fill', d=>fill.sex(d.type))
                })
    })


    return (
        <div id='t_sums'>
            <div id='t_sum_count' className='cell_l'><h5>Count</h5><p className='t_sum_value'>-</p></div>
            <div className='cell_s'></div>
            <div className='cell_xs'></div>
            <div id='t_sum_raw' className='cell_m' style={{display: 'block'}}><h5>Ratio</h5><svg className='t_sum_graph'></svg></div>
            <div className='cell_m'></div>
            <div id='t_sum_imputed' className='cell_m' style={{display: 'block'}}><h5>Ratio</h5><svg className='t_sum_graph'></svg></div>
            <div id='t_sum_exome' className='cell_m' style={{display: 'block'}}><h5>Ratio</h5><svg className='t_sum_graph'></svg></div>
            <div className='cell_m' style={{display: manual ? 'block' : 'none'}}></div>
            <div id='t_sum_ref' className='cell_s'><h5>Mean</h5><p className='t_sum_value'>-</p></div>
            <div id='t_sum_alt' className='cell_s'><h5>Mean</h5><p className='t_sum_value'>-</p></div>
            <div id='t_sum_birth' className='cell_xs'><h5>Mean</h5><p className='t_sum_value'>-</p></div>
            <div id='t_sum_sex' className='cell_m' style={{display: 'block'}}><h5>Ratio</h5><svg className='t_sum_graph'></svg></div>
            <div className='cell_xl'></div>
        </div>
    )
}

export default Sums;