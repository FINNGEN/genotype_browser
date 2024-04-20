import React, { useState, useEffect } from 'react'


export const VariantQC = (props) => { 

    const [variants, setVariants] = useState(props.props);
    const [dataQC, setDataQC] = useState(null);
    const [errorMessage, setError] = useState(null);
    const [variantsNoExclusion, setViaraintsNoExclusion] = useState([]);
    const [tableRows, setTableRows] = useState([]);

    useEffect(() => {
        const url = '/api/v1/qc/' + variants.join(',');
        fetch(url).then((response) => response.json()).then(data => {
            setDataQC(data);
            setError(null);
        }).catch(error => setError(error.message));
    }, [variants]);

    useEffect(() => { errorMessage && console.error(errorMessage) },[errorMessage]);

    useEffect(() => { 
        if (dataQC) {
            setViaraintsNoExclusion(dataQC.filter(variant => variant.exclusions.length == 0)) ;

            var trows = [];
            dataQC.map(variant => {
            
                var varRowsNumb = variant['exclusions'].length;
                variant['exclusions'].map((e, index) => { 
                    var row = [];
                    const batches = [];
        
                    const axiom_batches = e.axiom_batches.length === 0 ? null : 
                        e.axiom_batches.length === variant.total_axiom_batch_count ? 'All Axiom' : e.axiom_batches.join(',');
                    
                    const leagacy_batches = e.legacy_batches.length === 0 ? null : 
                        e.legacy_batches.length === variant.total_legacy_batch_count ? 'All legacy' : e.legacy_batches.join(',');
                    
                    axiom_batches && batches.push(axiom_batches);
                    leagacy_batches && batches.push(leagacy_batches);
        
                    varRowsNumb > 0 ? row.push({'rowSpan': varRowsNumb, 'cellValue': variant.variant}) : null;
                    row.push({'rowSpan': "", 'cellValue': e.reason});
                    row.push({'rowSpan': "", 'cellValue': e.axiom_batches.length + e.legacy_batches.length});
                    row.push({'rowSpan': "", 'cellValue': batches.join(',')});
                    varRowsNumb = 0;
                    trows.push(row);
                });
        
            });
    
            setTableRows(trows);
        }

    }, [dataQC]);

    return(
        <div>
            {
                errorMessage === null ?
                <div>
                {
                    tableRows.length ? <h3>Batch exclusion summary</h3> : null
                }
                {
                    tableRows.length > 0 ? 
                        dataQC && dataQC.length > 0 ? 
                        <table className="anno">
                            <tbody>
                                <tr>
                                <th>Variant</th>
                                <th>QC fail reason</th>
                                <th>Number of batches with failed QC</th>
                                <th>Batches</th>
                                </tr>
                                {
                                    tableRows.map( rows => { return (
                                    <tr>
                                        {
                                            rows.map( cell => { return (
                                                <td rowSpan = {cell.rowSpan}> {cell.cellValue} </td>
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

