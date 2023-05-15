import React, { Component, useEffect, useState } from 'react';
import Instructions from './info/instructions.jsx'
import Table from './info/table.jsx'
import Count from './mutual/count.jsx'
import * as d3 from "d3";

function Info (props) {

    const chr = props.chr,
        pos = props.pos,
        vRef = props.vRef,
        vAlt = props.vAlt,
        dataTotal = props.dataTotal,
        dataVisible = props.dataVisible,
        dataSelected = props.dataSelected,
        setDataTotal = props.setDataTotal,
        setDataVisible = props.setDataVisible,
        setDataSelected = props.setDataSelected,
        setDataLocation = props.setDataLocation,
        rename = props.rename,
        fill = props.fill,
        color = props.color,
        manual = props.manual,
        setManual = props.setManual,
        selectMode = props.selectMode,
        currentFill = props.currentFill,
        contentWidth = props.contentWidth

    const tableHeight = contentWidth / 2 + 20;

    const [exportView, setExportView] = useState(false)

    function exportData(data, button) {
        const data_export_tsv_header = Object.keys(data[0]).join('\t'), 
            data_export_tsv_rows = data.map(el => Object.values(el).join('\t')).join('\n'),
            data_export_tsv = data_export_tsv_header + '\n' + data_export_tsv_rows;

        const blob = new Blob([data_export_tsv], {type: 'text/tsv'})        
        d3.select(button).attr('download', chr + "_" + pos + "_" + vRef + "_" + vAlt + "_cp_"+ props.date + '.tsv')
        document.querySelector(button).href = window.URL.createObjectURL(blob);
    }

    useEffect(()=> {

        d3.select('#b_manual_add').on('click', ()=>{
            setDataVisible(dataVisible.map(d => ({...d, manual: null})))
            setDataTotal(dataTotal.map(d => ({...d, manual: null})));
            setDataSelected(dataSelected.map(d => ({...d, manual: null})));
            setManual(true);
            d3.select('#t_rows').selectAll('.manual').style('display', 'block')
        })
    })


    return (
        <div id="info" style={{width: window.innerWidth - contentWidth / 2}}>
            {dataSelected.length === 0 && (<Instructions tableHeight={tableHeight}/>)}
            {dataSelected.length > 0 && (<>
                <div className="v3c-heading button" style={{paddingRight: '4px'}}>
                    <a download
                        id='a_export_data_selection' 
                        style={{display: exportView ? 'block' : 'none'}}
                        onClick={()=>{exportData(dataSelected, "#a_export_data_selection")}}
                        ><button 
                                id='b_export_data_selection' 
                                style={{float: 'right', marginRight: '0'}}
                                type="submit"
                                className='button_secondary'
                    >Selection</button></a>
                    <a download
                        id='a_export_data_all'
                        style={{display: exportView ? 'block' : 'none'}}
                        onClick={()=>{exportData(dataTotal, "#a_export_data_all")}}
                        ><button 
                                id='b_export_data_all' 
                                style={{float: 'right'}}
                                type="submit"
                                className='button_secondary'
                    >All</button></a>
                    <button
                        id='b_export_data'
                        style={{float: 'right', marginRight: exportView ? '4px' : '0'}}
                        className={exportView ? 'button_primary button_active' : 'button_primary'}
                        onClick={()=>{setExportView(!exportView)}}
                        >{exportView ? '✕' : 'Export data'}
                    </button>
                </div>
                <Count 
                    destination={'info'}
                    data={dataSelected}
                    currentFill={currentFill}
                    rename={rename}
                    fill={fill}
                    selectMode={selectMode}
                />
                <Table 
                    vRef = {vRef}
                    vAlt ={vAlt}
                    rename={rename}
                    fill={fill}
                    color={color}
                    manual={manual}
                    contentWidth={contentWidth}
                    tableHeight={tableHeight}
                    dataTotal={dataTotal}
                    dataVisible={dataVisible}
                    dataSelected={dataSelected}
                    setDataTotal={setDataTotal}
                    setDataVisible={setDataVisible}
                    setDataSelected={setDataSelected}
                    setDataLocation={setDataLocation}
                />
                {!manual && (<div id='t_manual_add' style={{height: tableHeight +'px'}}>
                    <button id='b_manual_add' className='button_primary'>Add manual</button>
                </div>)}
            </>)}
        </div>
    )
}

export default Info;
