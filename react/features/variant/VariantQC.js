import React, { useState, useEffect } from 'react'


export const VariantQC = (props) => { 

    const [variants, setVariants] = useState(props.props)
    const [dataQC, setDataQC] = useState([])
    const [errorMessage, setError] = useState(null)

    const getData = async () => { 
        const url = '/api/v1/qc/' + variants.join(',')
        try {
            const response = await fetch(url)
            if (response.status != 200){
                throw new Error('QC data not found')
            } else {
                const dataQC = await response.json()
                setDataQC(dataQC)
                setError(null);
            }            
        } catch(err){
            setError(err.message);
        }
    }

    useEffect (() => { getData() }, [variants])

    console.log("dataQC", dataQC)

    var tableRows = [];
    dataQC.map(variant => {
        
        var varRows = variant['exclusions'].map(p => p['pipeline_exclusions'].length);
        var varRowsNumb = varRows.reduce((acc, curr) => acc + curr, 0);

        variant['exclusions'].map(p => { 

            var pipelinRowsNumb = p['pipeline_exclusions'].length;

            p['pipeline_exclusions'].map(e => {
                
                var row = [];

                varRowsNumb > 0 ? row.push({'rowSpan': varRowsNumb, 'cellValue': variant.variant}) : null;
                pipelinRowsNumb > 0 ? row.push({'rowSpan': pipelinRowsNumb, 'cellValue': p.pipeline}) : null;
                
                row.push({'rowSpan': "", 'cellValue': e.reason});
                row.push({'rowSpan': "", 'cellValue': e.batches_count});
                row.push({'rowSpan': "", 'cellValue': e.batches_count == variant.total_axiom_batch_count ? 'All Axiom' : e.batches});

                pipelinRowsNumb = 0;
                varRowsNumb = 0;

                tableRows.push(row);

            });

        })

     })    
     
    return(
        <div style={{marginTop: "30px", marginBottom: "30px"}}>
            {
                // errorMessage === null ?
                <div>
                <h3>QC Pipeline Batch Exclusion Summary</h3>
                {
                    tableRows.length === 0 ? <p>No batches were exluded from the imputation.</p> :
                    <table className="anno">
                        <tbody>
                            <tr>
                            <th>Variant</th>
                            <th>Pipeline</th>
                            <th>Reason for exclusion</th>
                            <th>Number of batches excluded</th>
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
                </div>
                // : "ERROR message: " + errorMessage
            }
        </div>
    )

    return null;

}

export default VariantQC;

