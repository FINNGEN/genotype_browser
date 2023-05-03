import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function FilterV3C (props) {

    const dataTotal = props.dataTotal,
        setDataVisible = props.setDataVisible,
        dataExternal = props.dataExternal,
        rename = props.rename,
        manual = props.manual

    const dataProbeID_Keys = Array.from(d3.rollup(dataTotal, v => v.length, d => d.probeID).keys()),
        dataBatch_Keys = Array.from(d3.rollup(dataTotal, v => v.length, d => d.batch).keys()),
        dataSex_Keys = Array.from(d3.rollup(dataTotal, v => v.length, d => d.sex).keys()),
        dataRaw_Keys = Array.from(d3.rollup(dataTotal, v => v.length, d => d.raw).keys()),
        dataQCd_Keys = Array.from(d3.rollup(dataTotal, v => v.length, d => d.excluded).keys()),
        dataImputed_Keys = Array.from(d3.rollup(dataTotal, v => v.length, d => d.imputed).keys()),
        dataExome_Keys = Array.from(d3.rollup(dataTotal, v => v.length, d => d.exome).keys()),
        dataManual_Keys = [2, 1, 0, -1, undefined],
        dataSource_Keys = Array.from(d3.rollup(dataTotal, v => v.length, d => d.biobank).keys()).sort();
    
    const dataExternal_IDs = dataExternal.length > 0 ? dataExternal.map(el => el.FINNGENID) : []

    var visibility = {
            probeID: [],
            batch: [],
            sex: [],
            raw: [],
            excluded: [],
            imputed: [],
            exome: [],
            manual: [],
            source: [],
            external: [],
            inconsistent: false,
        }
    
    var primary = [
            {
                'id': 'probeID',
                'name': 'Probe ID',
                'buttons': dataProbeID_Keys,
            },
            {
                'id': 'batch',
                'name': 'Batch',
                'buttons': dataBatch_Keys,
            },
            {
                'id': 'sex',
                'name': 'Sex',
                'buttons': dataSex_Keys,
            },
            {
                'id': 'raw',
                'name': 'Raw',
                'buttons': dataRaw_Keys,
            },
            {
                'id': 'excluded',
                'name': 'QCd',
                'buttons': dataQCd_Keys,
            },
            {
                'id': 'imputed',
                'name': 'Imputed',
                'buttons': dataImputed_Keys,
            },
            {
                'id': 'exome',
                'name': 'Exome',
                'buttons': dataExome_Keys,
            },
            {
                'id': 'manual',
                'name': 'Manual',
                'buttons': dataManual_Keys,
            },
            {
                'id': 'source',
                'name': 'Source',
                'buttons': dataSource_Keys,
            }
            // {
            //     'id': 'external',
            //     'name': 'External selection',
            //     'buttons': ['Selected', 'All others'],
            // },
        ]

    var QCpass = [], QCfail = []

    d3.groups(dataTotal, el => el.batch).forEach(batch => {
        const QCtypes = Array.from(d3.rollup(batch[1], v => v.length, d => d.excluded).keys())
        if (QCtypes.length === 1 && QCtypes[0] === 1) QCfail.push(batch[0])
        else if ((QCtypes.length === 1 && QCtypes[0] === 0)) QCpass.push(batch[0])
    })

    function renameButton(id, datum){
        if (id === 'batch') return rename.batch(datum)
        else if (id === 'source') return rename.source(datum)
        else if (id === 'probeID') return rename.generic(datum)
        else if (id === 'excluded') return rename.qc(datum)
        else if (id === 'external') return datum
        else return rename.calls(datum)
    }

    function getCheckExternal(length, item, datum){
        if (dataExternal.length === 0) return true
        
        else if (length === 0 || length === 2) return true
        else if (length === 1 && item === 'Selected') return dataExternal_IDs.includes(datum)
        else if (length === 1 && item === 'All others') return !dataExternal_IDs.includes(datum)
    }

    function getDataVisible(){
        const newDataVisible = []
        dataTotal.forEach(el => {
            const checkSource = visibility.source.includes(el.biobank) || visibility.source.length === 0, 
                checkProbeID = visibility.probeID.includes(el.probeID) || visibility.probeID.length === 0, 
                checkRaw = visibility.raw.includes(el.raw) || visibility.raw.length === 0,
                checkQCd = visibility.excluded.includes(el.excluded) || visibility.excluded.length === 0,
                checkImputed = visibility.imputed.includes(el.imputed) || visibility.imputed.length === 0, 
                checkSex = visibility.sex.includes(el.sex) || visibility.sex.length === 0,
                checkExome = visibility.exome.includes(el.exome) || visibility.exome.length === 0, 
                checkBatch = visibility.batch.includes(el.batch) || visibility.batch.length === 0, 
                checkManual = visibility.manual.includes(el.manual) || visibility.manual.length === 0,
                checkExternal = getCheckExternal(visibility.external.length, visibility.external[0], el.FINNGENID),
                checkInconsistent = (visibility.inconsistent && el.raw !== -1 && el.raw !== el.imputed) || !visibility.inconsistent
                
            checkSource && checkProbeID && checkRaw && checkQCd && checkImputed && checkSex && checkExome && checkBatch && checkManual && checkExternal && checkInconsistent && newDataVisible.push(el)
        })
        setDataVisible(newDataVisible)
    }

    function drawAllTHL(){
        const thl = []
        dataSource_Keys.forEach(el => {if (el.includes("THL")) thl.push(el)})
        if (thl.length > 1) d3.select('#p_filter_source').append('button')
            .attr('class', 'button_secondary p_button')
            .attr('id', 'p_filter_thlall')
            .style('display', 'none')
            .html('THL All sources')
            .on('click', function(e){
                const visible = d3.select(this).classed('button_secondary_active')
                d3.select(this).classed('button_secondary_active', !visible)
                d3.selectAll('.thl').classed('button_secondary_active', !visible)
                if (visible) {visibility.source = visibility.source.filter(el => !el.includes('THL'))}
                else {thl.forEach(el => {!visibility.source.includes(el) && visibility.source.push(el)})}
                getDataVisible()
            })
    }

    function drawInconsistent(){
        d3.select('#p_filter_buttons').append('div')
            .attr('class', 'filter_container')
            .attr('id', 'p_filter_inconsistent')
            .append('button')
                .attr('class', 'button_primary')
                .html('Raw-imputed inconsistent')
                .on('click', function(){
                    const visible = d3.select(this).classed('button_active')
                    d3.select(this).classed('button_active', !visible)
                    visibility.inconsistent = !visible
                    console.log(visibility)
                    getDataVisible()
                })
    }

    function manageBatchQC (id, datum, visible) {
        if (datum === 0 || datum === 1) {
            d3.select('#p_filter_batch').select('.button_primary').classed('button_active', true)
            d3.select('#p_filter_batch').selectAll('.button_secondary').style('display', 'block')
            d3.select('#p_filter_excluded').selectAll('.button_secondary').classed('button_secondary_active', visible)
            d3.select(id).classed('button_secondary_active', !visible)
        }
        if (datum === 1) {
            d3.selectAll('.qcfail').classed('button_secondary_active', !visible)
            d3.selectAll('.qcpass').classed('button_secondary_active', visible)
            if (visible) {
                visibility.batch = []
                visibility.excluded = []
            } else {
                visibility.batch = QCfail
                visibility.excluded = [1]
            }
        }
        else if (datum === 0) {
            d3.selectAll('.qcpass').classed('button_secondary_active', !visible)
            d3.selectAll('.qcfail').classed('button_secondary_active', visible)
            if (visible) {
                visibility.batch = []
                visibility.excluded = []
            } else {
                visibility.batch = QCpass
                visibility.excluded = [0]
            }
        }
    }

    // function drawQCfilters(){
    //     d3.select('#p_filter_batch').append('button')
    //         .attr('class', 'button_secondary p_button')
    //         .attr('id', 'p_filter_qcfail')
    //         .style('display', 'none')
    //         .html('QC fail')
    //         .on('click', function(e){
    //             const visible = d3.select(this).classed('button_secondary_active')
    //             d3.select(this).classed('button_secondary_active', !visible)
    //             d3.selectAll('.qcfail').classed('button_secondary_active', !visible)
    //             if (visible) {
    //                 visibility.batch = visibility.batch.filter(el => !QCfail.includes(el))
    //             }
    //             else {
    //                 QCfail.forEach(el => {!visibility.batch.includes(el) && visibility.batch.push(el)})
    //                 visibility.excluded.push(1)
    //             }
    //             getDataVisible()
    //         })
    //     d3.select('#p_filter_batch').append('button')
    //         .attr('class', 'button_secondary p_button')
    //         .attr('id', 'p_filter_qcpass')
    //         .style('display', 'none')
    //         .html('QC pass')
    //         .on('click', function(e){
    //             const visible = d3.select(this).classed('button_secondary_active')
    //             d3.select(this).classed('button_secondary_active', !visible)
    //             d3.selectAll('.qcpass').classed('button_secondary_active', !visible)
    //             if (visible) {visibility.batch = visibility.batch.filter(el => !QCpass.includes(el))}
    //             else {QCpass.forEach(el => {!visibility.batch.includes(el) && visibility.batch.push(el)})}
    //             getDataVisible()
    //         })
    // }

    useEffect(()=> {

        const div = d3.select('#p_filter_buttons').selectAll('.filter_container').data(primary).enter()
            .append('div')
            .attr('class', 'filter_container')
            .attr('id', d => 'p_filter_' + d.id)
                    
        div.append('button')
            .html(d => d.name)
            .attr('class', d => 'button_primary ' + d.id)
            .on('click', function(e, d){
                const active = d3.select(this).classed('button_active')
                d3.select(this.parentNode).selectAll('.button_secondary').style('display', active ? 'none' : 'block')
                d3.select(this).classed('button_active', !active)
                if (active) {
                    d3.select(this.parentNode).selectAll('.button_secondary').classed('button_secondary_active', false)
                    visibility[d.id]=[];
                    getDataVisible() 
                }
            })

        div.selectAll('.button_secondary').data(d => d.buttons).enter().append('button')
            .html(function(datum){
                const id = d3.select(this.parentNode).attr('id').replace('p_filter_','')
                return renameButton(id, datum)
            })
            .attr('class', 'button_secondary p_button')
            .classed('thl', function(datum){
                const id = d3.select(this.parentNode).attr('id').replace('p_filter_','')
                if (id === 'source') return datum.includes('THL')
            })
            .classed('qcfail', function(datum){
                const id = d3.select(this.parentNode).attr('id').replace('p_filter_','')
                if (id === 'batch') return QCfail.includes(datum)
            })
            .classed('qcpass', function(datum){
                const id = d3.select(this.parentNode).attr('id').replace('p_filter_','')
                if (id === 'batch') return QCpass.includes(datum)
            })
            .style('display', 'none')
            .on('click', function(e, datum){
                const visible = d3.select(this).classed('button_secondary_active')
                const id = d3.select(this.parentNode).attr('id').replace('p_filter_','')
                if (visible) visibility[id] = visibility[id].filter(el => el !== datum)
                else visibility[id].push(datum)
                if (id === 'excluded') manageBatchQC(this, datum, visible)
                if (visible && id === 'source' && d3.select(this).classed('thl') && d3.select('#p_filter_thlall').classed('button_secondary_active')) d3.select('#p_filter_thlall').classed('button_secondary_active', false)
                d3.select(this).classed('button_secondary_active', !visible)
                getDataVisible()
            })
                
            !document.getElementById('p_filter_thlall') && drawAllTHL()
            !document.getElementById('p_filter_inconsistent') && drawInconsistent()
            d3.select('#p_filter').selectAll('.manual').style('display', manual ? 'block' : 'none')
    })


    return (
        <div className="panel" id="p_filter" style={{margin: 0}}>
            <div className="p_container">
                <div className="p_inner">Filter</div>
                <div className="p_buttons" id="p_filter_buttons"></div>
            </div>
        </div>
    )
}

export default FilterV3C;