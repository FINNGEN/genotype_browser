import React, { Component, useEffect, useState } from 'react';
import * as d3 from "d3";

function Alert (props) {
    
    const dataTotal = props.dataTotal,
        selectMode = props.selectMode,
        currentFill = props.currentFill,
        rename = props.rename,
        totalBatches = Array.from(d3.rollup(dataTotal, v => v.length, d => d.batch).keys()).length

    var QCfail = [],
        QCfail_list = ""

    d3.groups(dataTotal, el => el.batch).forEach(batch => {
        const QCtypes = Array.from(d3.rollup(batch[1], v => v.length, d => d.excluded).keys())
        if (QCtypes.length === 1 && QCtypes[0] === 1) QCfail.push(batch[0])
    })

    QCfail.length > 0 && QCfail.forEach((el, i) => {
        if (i === 0) QCfail_list = rename.batch(el)
        else if (i === QCfail.length-1) QCfail_list = QCfail_list + " and " + rename.batch(el)
        else QCfail_list = QCfail_list + ", " + rename.batch(el)
    })

    function getOpacity(){
        if (selectMode[0]) return 1
        else if (currentFill === 'imputed' || currentFill === 'excluded') return 1
        else return 0
    }

    function getText(){
        if (selectMode[0]) return "Draw a polygon selection on the chart area."
        else if (currentFill === 'imputed') {
            if (dataTotal[2].excluded_panel === 1) return "No genotypes were used from chip for imputation because this variant's frequency in the panel is smaller than 0.001 or the variant doesn't exist in the panel."
            else if (QCfail.length === 1) return "Chip genotype 1 batch was excluded."
            else if (QCfail.length === totalBatches) return "Chip genotype from all batches were excluded."
            return "Chip genotype from " + QCfail.length + " batches were excluded."
        }
        else if (currentFill === 'excluded') {
            if (QCfail.length === 0) return "No batches were excluded."
            else if (QCfail.length === 1) return "Batch " + QCfail_list + " was excluded."
            else if (QCfail.length < 7) return "Batches " + QCfail_list + " were excluded."
            else if (QCfail.length === totalBatches) return "Chip genotype from all batches were excluded."
            else return "Chip genotype from " + QCfail.length + " batches were excluded."
        }
    }

    return (
        <p
            id="g_alert"
            style={{opacity: getOpacity()}}
            >{getText()}
        </p>
    )
}

export default Alert;