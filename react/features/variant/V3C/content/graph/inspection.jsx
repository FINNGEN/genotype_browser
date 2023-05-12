import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Inspection (props) {

    const vRef = props.vRef,
        vAlt = props.vAlt,
        dataSelected = props.dataSelected,
        dataInspection = props.dataInspection,
        setDataInspection = props.setDataInspection,
        setDataSelected = props.setDataSelected,
        rename = props.rename,
        fill = props.fill,
        center = props.center,
        manual = props.manual
    
    return (
        <div 
            id="g_inspection"
            style={{
                left: center.x(dataInspection.intensity_ref) + 80 + 'px',
                top: center.y(dataInspection.intensity_alt) + 135 + 'px'
            }}
            >
            <div id="g_inspection_header">
                <h5 style={{cursor: 'pointer'}} onClick={()=>{setDataInspection()}}>✕</h5>
            </div>
            <div id="g_inspection_rows">
                <div className="g_inspection_group">
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">FinnGen ID</p>
                        <p className="g_inspection_value">{dataInspection.FINNGENID}</p>
                    </div>
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">Source</p>
                        <p className="g_inspection_value">{rename.generic(dataInspection.biobank)}</p>
                    </div>
                </div>
                <div className="g_inspection_group">
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">Probe ID</p>
                        <p className="g_inspection_value">{rename.generic(dataInspection.probeID)}</p>
                    </div>
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">Batch</p>
                        <p className="g_inspection_value">{rename.batch(dataInspection.batch)}</p>
                    </div>
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">Birth</p>
                        <p className="g_inspection_value">{dataInspection.birth_year}</p>
                    </div>
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">Sex</p>
                        <div className="g_inspection_call">
                            <div className="t_circle" style={{backgroundColor: fill.sex(dataInspection.sex)}}></div>
                            <p className="g_inspection_value">{rename.calls(dataInspection.sex)}</p>
                        </div>
                    </div>
                </div>
                <div className="g_inspection_group">
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">{vRef} intensity</p>
                        <p className="g_inspection_value">{d3.format(".2f")(dataInspection.intensity_ref)}</p>
                    </div>
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">{vAlt} intensity</p>
                        <p className="g_inspection_value">{d3.format(".2f")(dataInspection.intensity_alt)}</p>
                    </div>
                </div>
                <div className="g_inspection_group" style={{borderWidth: 0, margin: 0}}>
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">Raw</p>
                        <div className="g_inspection_call">
                            <div className="t_circle" style={{backgroundColor: fill.calls(dataInspection.raw)}}></div>
                            <p className="g_inspection_value">{rename.calls(dataInspection.raw)}</p>
                        </div>
                    </div>
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">QCd</p>
                        <div className="g_inspection_call">
                            <div className="t_circle" style={{backgroundColor: fill.qc(dataInspection.excluded)}}></div>
                            <p className="g_inspection_value">{rename.qc(dataInspection.excluded)}</p>
                        </div>
                    </div>
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">Imputed</p>
                        <div className="g_inspection_call">
                            <div className="t_circle" style={{backgroundColor: fill.calls(dataInspection.imputed)}}></div>
                            <p className="g_inspection_value">{rename.calls(dataInspection.imputed)}</p>
                        </div>
                    </div>
                    <div className="g_inspection_row" style={{display: manual ? 'flex' : 'none'}}>
                        <p className="g_inspection_key">Manual</p>
                        <div className="g_inspection_call">
                            <div className="t_circle" style={{backgroundColor: fill.calls(dataInspection.manual)}}></div>
                            <p className="g_inspection_value">{rename.calls(dataInspection.manual)}</p>
                        </div>
                        
                    </div>
                    <div className="g_inspection_row">
                        <p className="g_inspection_key">Exome</p>
                        <div className="g_inspection_call">
                            <div className="t_circle" style={{backgroundColor: fill.calls(dataInspection.exome)}}></div>
                            <p className="g_inspection_value">{rename.calls(dataInspection.exome)}</p>
                        </div>
                    </div>
                    <button 
                        className="button_primary"
                        style={{margin: '12px 0 0 0', width: '100%', float: 'none'}}
                        onClick={()=>{
                            const thisID = dataInspection.FINNGENID
                            if (dataSelected.map(el=>el.FINNGENID).includes(thisID)) {
                                setDataSelected(dataSelected.filter(el => el.FINNGENID !== thisID))
                            } else {
                                var newDataSelected = [...dataSelected]
                                newDataSelected.push(dataInspection)
                                setDataSelected(newDataSelected)
                            }
                        }}
                    >{dataSelected.map(el=>el.FINNGENID).includes(dataInspection.FINNGENID) ? "Remove from selection" : "Add to selection"}</button>
                </div>
            </div>
        </div>
    )
}

export default Inspection;
