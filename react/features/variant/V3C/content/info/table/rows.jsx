import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Rows (props) {

    const dataTotal = props.dataTotal,
        dataVisible = props.dataVisible,
        dataSelected = props.dataSelected,
        setDataTotal = props.setDataTotal,
        setDataVisible = props.setDataVisible,
        setDataSelected = props.setDataSelected,
        setDataLocation = props.setDataLocation,
        setChangeView = props.setChangeView,
        rename = props.rename,
        fill = props.fill,
        color = props.color,
        manual = props.manual,
        tableHeight = props.tableHeight

        function addManualCall(cell, finngenID){
            d3.select(cell)
                .classed('t_manual', true)
                .attr('data-selected', 'selected')
                .append('select')
                    .on('change', (e)=>{
                        const newManual = parseInt(e.target.value, 10);

                        const indexSelected = dataSelected.map(e=>e.FINNGENID).indexOf(finngenID)
                        var newDataSelected = [...dataSelected]
                        newDataSelected[indexSelected].manual = newManual

                        const indexTotal = dataTotal.map(e=>e.FINNGENID).indexOf(finngenID)
                        var newDataTotal = [...dataTotal]
                        newDataTotal[indexTotal].manual = newManual

                        const indexVisible = dataVisible.map(e=>e.FINNGENID).indexOf(finngenID)
                        var newDataVisible = [...dataVisible]
                        newDataVisible[indexVisible].manual = newManual

                        setChangeView(newManual)
                        setDataSelected(newDataSelected)
                        setDataTotal(newDataTotal)
                        setDataVisible(newDataVisible)
                    })
                    .selectAll('option').data([null, 0, 1, 2, -1]).enter()
                        .append('option')
                        .attr('value', d=>d)
                        .html(d=>rename.calls(d))
        }

    useEffect(()=> {

            d3.select('#table').on('mouseleave', () => setDataLocation(undefined))

            d3.select('#t_rows').selectAll('.t_complete_row').data(dataSelected).join(
                function(enter){
                    const row = enter.append('div')
                        .attr('class', 't_complete_row')
                        .style('background-color', (d,i)=> i % 2 === 0 ? color.background : color.lightgray)
                        .on('mouseover', (e,d) => setDataLocation(d))

                        row.append('div').attr('class', 'spec cell_l finngen').html(d=>d.FINNGENID)
                        row.append('div').attr('class', 'spec cell_s probe').html(d=> rename.generic(d.probeID))
                        row.append('div').attr('class', 'spec cell_xs batch').html(d=>rename.batch(d.batch))
            
                        const raw = row.append('div').attr('class', 'spec cell_m raw')
                            raw.append('div').attr('class', 't_circle').style('background-color', d=>fill.calls(d.raw));
                            raw.append('div').attr('class', 't_text').html(d=>rename.calls(d.raw))
                        
                        const qcd = row.append('div').attr('class', 'spec cell_m excluded')
                            qcd.append('div').attr('class', 't_circle').style('background-color', d=>fill.qc(d.excluded));
                            qcd.append('div').attr('class', 't_text').html(d=>rename.qc(d.excluded))
                        
                        const imp = row.append('div').attr('class', 'spec cell_m imputed')
                            imp.append('div').attr('class', 't_circle').style('background-color', d=>fill.calls(d.imputed));
                            imp.append('div').attr('class', 't_text').html(d=>rename.calls(d.imputed))
                        
                        const exo = row.append('div').attr('class', 'spec cell_m exome')
                            exo.append('div').attr('class', 't_circle').style('background-color', d=>fill.calls(d.exome));
                            exo.append('div').attr('class', 't_text').html(d=>rename.calls(d.exome))
                        
                        const man = row.append('div').attr('class', 'cell_m manual')
                            .style('display', manual ? 'flex' : 'none')
                            .on('click', function(e,d){
                                var selected = d3.select(this).attr('data-selected') === 'selected'
                                if (!selected) {d3.select(this).html(''); addManualCall(this, d.FINNGENID)}
                            })
                            man.append('div').attr('class', 't_circle').style('background-color', d=>fill.calls(d.manual));
                            man.append('div').attr('class', 't_text').html(d=> rename.calls(d.manual))
        
                        row.append('div').attr('class', 'spec cell_s vRef').html(d=>d3.format(".2f")(d.intensity_ref))
                        row.append('div').attr('class', 'spec cell_s vAlt').html(d=>d3.format(".2f")(d.intensity_alt))   
                        row.append('div').attr('class', 'spec cell_xs birth').html(d=> d.birth_year)
                        
                        const sex = row.append('div').attr('class', 'spec cell_m sex')
                            sex.append('div').attr('class', 't_circle').style('background-color', d=>fill.sex(d.sex));
                            sex.append('div').attr('class', 't_text').html(d=>rename.calls(d.sex))
                        
                        row.append('div').attr('class', 'spec cell_xl source').html(d=>rename.source(d.biobank))
            
                        // row.selectAll('.spec').on('click', (e,d)=>{drawSpecification(d); drawRemoveButton(d);})
                    }, 
                    function(update){
                        update.style('background-color', (d,i)=> i % 2 === 0 ? color.background : color.lightgray)
                        update.select('.finngen').html(d=>d.FINNGENID)
                        update.select('.probe').html(d=>rename.generic(d.probeID))
                        update.select('.batch').html(d=>rename.batch(d.batch))
                        update.select('.raw').select('.t_text').html(d=>rename.calls(d.raw))
                        update.select('.raw').select('.t_circle').style('background-color', d=>fill.calls(d.raw));
                        update.select('.excluded').select('.t_text').html(d=>rename.qc(d.excluded))
                        update.select('.excluded').select('.t_circle').style('background-color', d=>fill.qc(d.excluded));
                        update.select('.imputed').select('.t_text').html(d=>rename.calls(d.imputed))
                        update.select('.imputed').select('.t_circle').style('background-color', d=>fill.calls(d.imputed));
                        update.select('.exome').select('.t_text').html(d=>rename.calls(d.exome))
                        update.select('.exome').select('.t_circle').style('background-color', d=>fill.calls(d.exome));
                        update.select('.manual').style('display', manual ? 'flex' : 'none');
                        update.select('.manual').select('.t_text').html(d=> rename.calls(d.manual))
                        update.select('.manual').select('.t_circle').style('background-color', d=>fill.calls(d.manual));
                        update.select('.vRef').html(d=>d3.format(".2f")(d.intensity_ref))
                        update.select('.vAlt').html(d=>d3.format(".2f")(d.intensity_alt))  
                        update.select('.birth').html(d=> d.birth_year)
                        update.select('.sex').select('.t_text').html(d=>rename.calls(d.sex))
                        update.select('.sex').select('.t_circle').style('background-color', d=>fill.sex(d.sex));
                        update.select('.source').html(d=>rename.source(d.biobank))
                    }
                    )
    })

    return (
        <div id='t_rows' style={{height: tableHeight - 86 + 'px'}}></div>
    )
}

export default Rows;