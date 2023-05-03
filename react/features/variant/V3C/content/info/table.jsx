import React, { Component, useEffect, useState } from 'react';
import Rows from './table/rows.jsx'
import Sums from './table/sums.jsx'
import * as d3 from "d3";

function Table (props) {

    const vRef = props.vRef,
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
        tableHeight = props.tableHeight

    const [changeView, setChangeView] = useState(undefined)

    d3.select('#b_manual_change').on('click', function(){
        var newDataSelected = [...dataSelected].map(v => ({...v, manual: changeView}));
        
        var newDataTotal = [...dataTotal],
            newDataVisible = [...dataVisible]

        dataSelected.map(el=>el.FINNGENID).forEach(finngenID=>{
            const indexTotal = dataTotal.map(el=>el.FINNGENID).indexOf(finngenID),
                indexVisible = dataVisible.map(el=>el.FINNGENID).indexOf(finngenID);
            
            newDataTotal[indexTotal].manual = changeView;
            newDataVisible[indexVisible].manual = changeView;
        });

        setDataSelected(newDataSelected)
        setDataTotal(newDataTotal)
        setDataVisible(newDataVisible)
        setChangeView(undefined)
    })

    // d3.select('#b_reset').on('click', function(){
    //     setDataSelected([]);
    //     setDataTotal([...dataInitial]);
    //     new_manual = null;

    //     d3.select('#p_filter').selectAll('button').classed('button_active', false)
    //     d3.select('#p_filter').selectAll('.button_secondary').classed('.button_secondary_active', false).classed('transparent', true)

    //     eraseTable()
    //     drawDots(dataTotal);

    //     d3.select('#b_manual_change').classed('transparent', true);
    //     d3.select('#t_manual_add').classed('transparent', false);
    //     d3.select('#t_table').style('width', '85.4%').classed('transparent', true);
    //     d3.selectAll('.manual').classed('transparent', true);
    //     d3.selectAll('circle').classed('g_dots_selected', false);

    //     d3.selectAll('.g_dots_click').remove();
    //     d3.selectAll('.g_rect').remove();

    //     d3.select('#t_manual_add').classed('transparent', true);
    //     d3.select('#table').selectAll('.heading').classed('transparent', true);
    //     d3.select('#t_message').classed('transparent', false);
    // })

    return (
        <div id='table' style={{width: manual ? '100%' : '84.7%'}}>
            <div id='t_inner'>
                <div id='t_firstrow'>
                    <div className='cell_l'>FinnGen ID</div>
                    <div className='cell_s'>Probe ID</div>
                    <div className='cell_xs'>Batch</div>
                    <div className='cell_m'>Raw</div>
                    <div className='cell_m'>QCd</div>
                    <div className='cell_m'>Imputed</div>
                    <div className='cell_m'>Exome</div>
                    <div className='cell_m' style={{display: manual ? 'block' : 'none'}}>Manual</div>
                    <div className='cell_s' id='t_first_ref'>{vRef} intensity</div>
                    <div className='cell_s' id='t_first_alt'>{vAlt} intensity</div>
                    <div className='cell_xs'>Birth</div>
                    <div className='cell_m'>Sex</div>
                    <div className='cell_xl'>Source</div>
                </div>
                <Rows 
                    fill={fill}
                    color={color}
                    rename={rename}
                    manual={manual}
                    tableHeight={tableHeight}
                    changeView={changeView}
                    setChangeView={setChangeView}
                    dataTotal={dataTotal}
                    dataVisible={dataVisible}
                    dataSelected={dataSelected}
                    setDataTotal={setDataTotal}
                    setDataVisible={setDataVisible}
                    setDataSelected={setDataSelected}
                    setDataLocation={setDataLocation}
                />
                {changeView !== undefined && (<div id='t_manual_change'>
                    <button id='b_manual_change' className='button_primary button_active'>
                        Change all the manual calls of the selection into {rename.calls(changeView)}
                    </button>
                </div>)}
                {changeView === undefined && (<Sums
                    dataSelected={dataSelected}
                    fill={fill}
                    rename={rename}
                    manual={manual}
                />)}
            </div>
        </div>
    )
}

export default Table;