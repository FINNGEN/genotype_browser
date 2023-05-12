import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Opener (props) {

    return (
        <div id="opener">
            <div id="o_logo">
                <img src="img/v3c_logo.svg" style={{margin: "50px"}} width="200px" />
            </div>
            <div id="o_description">
                <p>Only TSV format is accepted.<br/>File name encoding: Chromosome_Position_Ref_Alt.tsv<br/><br/>–<br/>A project by FinnGen in collaboration with Aalto University.<br/>FinnGen © 2022</p>
            </div>
        </div>
    )
}

export default Opener;
