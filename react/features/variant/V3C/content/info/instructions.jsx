import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Instructions (props) {

    const tableHeight = props.tableHeight

    const [view, setView] = useState(false)

    return (
        <div id='t_instructions' style={{height: tableHeight+20+'px'}}>
            <div style={{maxWidth: '290px'}}>
            <p>Select the dots to display information.</p>
            <h4 id='t_instruction_cta' style={{display: view ? 'none' : 'block'}} onClick={()=>{setView(true)}}><u>Read instructions</u></h4>
            <ol id='t_instruction_list' style={{display: view ? 'block' : 'none'}}>
                <li>EXPLORE the dataset by changing the coloring and the filtering of the dots in the bottom panel.<br/>Density isolines may be useful since dots overlap.<br/>Note data is sampled: from each batch, up to only 100 individuals of each genotype are included</li>
                <li>SELECT the interesting dots in the chart with<br/>the 'New selection' button on the top left corner.</li>
                <li>CORRECT their raw and imputed calls with the 'Add manual call' button on the right-side panel.</li>
                <li>EXPORT the dataset with the new 'Manual call' parameter using the 'Export data' button on the top right corner.</li>
            </ol>
            <h4 id='t_instruction_hide' style={{display: view ? 'block' : 'none'}} onClick={()=>{setView(false)}}><u>Hide instructions</u></h4>
            </div>
            
        </div>
    )
}

export default Instructions;