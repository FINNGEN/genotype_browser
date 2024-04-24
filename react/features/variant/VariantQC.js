import React, { useState, useEffect } from 'react'
import './styles.css'
import img from '../../public/img/qc_exclusion_reasons.png'

export const VariantQC = (props) => { 

    const [dataQC, setDataQC] = useState(props.data);
    const [error, setError] = useState(props.error);
    const [variantsNoExclusion, setViaraintsNoExclusion] = useState([]);
    const [tableRows, setTableRows] = useState([]);
    const [tableRendered, setTableRendered] = useState(false);

    useEffect(() => { 
        if (dataQC) {
            setViaraintsNoExclusion(dataQC.filter(variant => variant.exclusions.length == 0)) ;

            var trows = [];
            dataQC.map(variant => {
            
                var varRowsNumb = variant['exclusions'].length;
                variant['exclusions'].map((e, index) => { 
                    var row = [];
                    
                    const axiom_batches = e.axiom_batches.length === 0 ? null : 
                        e.axiom_batches.length === variant.total_axiom_batch_count ? 
                        <div key="all-axiom" style={{margin: '0px 5px 0px 5px'}}>
                        <a className='tooltip-top'>
                            <div>All Axiom Batches</div>
                            <span className='tooltiptext'><b>Value:</b> {e.axiom_batches[0]['VALUE']}</span>
                        </a>
                        </div> : 
                        e.axiom_batches.map((element, index) => {
                            return <div key={`"${index}-axiom"`} style={{margin: '0px 5px 0px 5px'}}>
                                <a className='tooltip-top'>
                                    <div>{element['BATCH'].split('_')[1]}</div>
                                    <span className='tooltiptext'><b>Value:</b> {element['VALUE']}</span>
                                </a>
                                </div>
                        });
                    
                    const legacy_batches = e.legacy_batches.length === 0 ? null : 
                        e.legacy_batches.length === variant.total_legacy_batch_count ? 
                        <div key="all-legacy" style={{margin: '0px 5px 0px 5px'}}>
                        <a className='tooltip-top'>
                            <div>All Legacy Batches</div>
                            <span className='tooltiptext'><b>Value:</b> {e.axiom_batches[0]['VALUE']}</span>
                        </a>
                        </div> : 
                        e.legacy_batches.map((element, index) => {                            
                            return <div key={`"${index}-leg"`} style={{margin: '0px 5px 0px 5px'}}>
                                <a className='tooltip-top'>
                                    <div>{element['BATCH']}</div>
                                    <span className='tooltiptext'><b>Value:</b> {element['VALUE']}</span>
                                </a>
                            </div>
                        });

                    const content = <div className='flex-container'>
                        {e.axiom_batches.length > 0 ? axiom_batches : null}
                        {e.legacy_batches.length > 0 ? legacy_batches : null}
                    </div>
        
                    varRowsNumb > 0 ? row.push({'rowSpan': varRowsNumb, 'cellValue': variant.variant}) : null;
                    row.push({'rowSpan': "", 'cellValue': e.reason});
                    row.push({'rowSpan': "", 'cellValue': e.axiom_batches.length + e.legacy_batches.length});
                    row.push({'rowSpan': "", 'cellValue': content
                    });
                    varRowsNumb = 0;
                    trows.push(row);
                });
        
            });
    
            setTableRows(trows);
            setTableRendered(true);
        }

    }, [dataQC]);

    return(
        <div>
            {
                error === null ?
                <div>
                {
                    tableRendered ? 
                    <div className='flex-container' style={{justifyContent: "left"}}>
                    <h3>Batch exclusion summary</h3> 
                        <a className='tooltip-right'>
                        <div className='tooltip-icon black'>?</div>
                        <span>
                            <img src={img} width="850px"/>
                        </span>
                        </a>
                    </div>
                    : null
                }
                {
                    tableRendered ? 
                        dataQC && tableRows.length > 0 && dataQC.length > 0 ? 
                        <table className="anno">
                            <tbody>
                                <tr>
                                <th>Variant</th>
                                <th>QC fail reason</th>
                                <th>Number of batches</th>
                                <th>Batches</th>
                                </tr>
                                {
                                    tableRows.map( (rows, index) => { return (
                                    <tr key={index}>
                                        {
                                            rows.map( (cell, i) => { return (
                                                <td key={i} rowSpan = {cell.rowSpan}> {cell.cellValue} </td>
                                            )})
                                        }
                                    </tr>
                                    ) })
                                }

                            </tbody>
                            </table> : <p>All batches PASS QC.</p> 
                    : null
                }
                {
                    variantsNoExclusion.length > 0 && tableRows.length > 0 ? 
                        <div style={{margin: "10px 0px 0px 5px"}}>
                            No batch exclusions found for the variant{variantsNoExclusion.length > 1 ? 's' : ''}:  
                                {variantsNoExclusion.map(element => element.variant).join(', ')}</div>: null
                }
                </div> : "ERROR :: " + errorMessage
            }
        </div>
    );

}

export default VariantQC;

