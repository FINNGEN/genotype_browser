import React, { useState, useEffect } from 'react'


export const VariantQC = (props) => { 

    const [variants, setVariants] = useState(props.props);
    const [dataQC, setDataQC] = useState([]);
    const [errorMessage, setError] = useState(null);
    const [varaintsNoExclusion, setVaraintsNoExclusion] = useState([]);

    const getData = async () => { 
        const url = '/api/v1/qc/' + variants.join(',');
        try {
            const response = await fetch(url)
            if (response.status != 200){
                throw new Error('QC data not found');
            } else {
                const dataQC = await response.json();
                setDataQC(dataQC);
                setError(null);
            }            
        } catch(err){
            setError(err.message);
        }
    }

    useEffect(() => { errorMessage && console.error(errorMessage) },[errorMessage]);
    useEffect(() => { getData() }, [variants]);
    useEffect(() => { setVaraintsNoExclusion(dataQC.filter(variant => variant.exclusions.length == 0)) }, [dataQC]);

    var tableRows = [];
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
            tableRows.push(row);
        });

    });


    return(
        <div>
            {
                errorMessage === null ?
                <div>
                <h3>Batch exclusion summary</h3>
                {
                    tableRows.length === 0 ? <p>No batch exclusion found for the varaint.</p> :
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
                        </table>                        
                }
                {
                    varaintsNoExclusion.length > 0 && tableRows.length > 0 ? 
                        <div style={{marginTop: "10px"}}>
                            No batch exclusions found for the varaint{varaintsNoExclusion.length > 1 ? 's' : ''}: 
                                {varaintsNoExclusion.map(element => element.variant).join(', ')}</div>: null
                }
                </div> : "ERROR :: " + errorMessage
            }
        </div>
    );

}

export default VariantQC;

