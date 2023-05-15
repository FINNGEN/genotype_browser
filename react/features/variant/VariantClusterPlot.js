import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux'
import Header from './V3C/header.jsx'
import Content from './V3C/content.jsx'
import * as d3 from "d3";
import './v3c.css'

export const VariantClusterPlot = () => {

    const [chr, setChr] = useState()
    const [pos, setPos] = useState()
    const [vRef, setVRef] = useState()
    const [vAlt, setVAlt] = useState()

    const [dataInitial, setDataInitial] = useState([])
    const [dataTotal, setDataTotal] = useState([[]])
    const [dataVisible, setDataVisible] = useState([])
    const [dataSelected, setDataSelected] = useState([])
    const [dataLocation, setDataLocation] = useState()
    const [dataExternal, setDataExternal] = useState([])
    const [selectMode, setSelectMode] = useState([false, undefined])
    const [manual, setManual] = useState(false)

    const [serverData, setServerData] = useState([])
    const [errorMessage, setError] = useState(null)
    const [dropPlot, setDropPlot] = useState(true)
    const gbData = useSelector(state => state.data) 
    const variants = useSelector(state => state.data.variants)
    const varName = variants[0].replaceAll('-', '_')

    useEffect (() => {
        const getData = async () => { 
            try {
                const response = await fetch('/api/v1/clusterplot/' + variants[0])
                if (response.status == 404){
                    var error = "Variant " + variants[0] + 
                        " exists in FinnGen chip but no cluster plot was found. Contact helpdesk to report the issue."
                    throw new Error(error)
                } else if (response.status == 400){
                    var error = "Error parsing the data."
                    throw new Error(error)
                } else if (response.status == 500){
                    var error = "Internal server error, let us know."
                    throw new Error(error)
                } else{
                    const data = await response.blob()
                    setError(null)
                    setServerData(data)
                    setDropPlot(false)
                }            
            } catch(err){
                setError(err.message);
            }
        }
        getData();
    }, [gbData])

    useEffect (() => {
        if (serverData.length !== 0){
            
            const reader = new FileReader()            
            reader.readAsText(serverData, "UTF-8")
            reader.onload = () => {

                const header = reader.result.split("\n")[0].split("\t")
                const indexID = header.indexOf("ID") === -1 ? header.indexOf("FINNGENID") : header.indexOf("ID")
                
                const data = reader.result.split("\n").slice(1)
                    .map(e=>{
                        const values = e.split("\t");
                        return {
                            "FINNGENID": values[indexID],
                            "batch": values[header.indexOf('batch')],
                            "sex": values[header.indexOf('sex')],
                            "intensity_ref": parseFloat(values[header.indexOf('intensity_ref')]),
                            "intensity_alt": parseFloat(values[header.indexOf('intensity_alt')]),
                            "raw": parseFloat(values[header.indexOf('raw_call')]),
                            "imputed": parseFloat(values[header.indexOf('imputed_call')]),
                            "exome": parseFloat(values[header.indexOf('exome_genotype')]),
                            "COHORT_SOURCE": "V3C_v3",
                            "COHORT_NAME": varName,
                            "probeID": values[header.indexOf('probeID')],
                            "birth_year": parseFloat(values[header.indexOf('birth_year')]),
                            "biobank": values[header.indexOf('biobank')],
                            "excluded": parseFloat(values[header.indexOf('excluded')]),
                            "excluded_panel" : parseFloat(values[header.indexOf('excluded_panel')])
                    }})

                const newDataInitial = data.filter(e => typeof e.batch === 'string')
                setDataInitial(newDataInitial)
                setDataTotal([...newDataInitial])
                setDataVisible([...newDataInitial])
                setDataSelected([])
                setDataLocation()

                const varArr = varName.split('_')               
                setPos(varArr[1])
                setVRef(varArr[2])
                setVAlt(varArr[3].replace(/\.[^.]*$/, ''))
                setChr(varArr[0])
            }
        }

        const fileExternal = document.getElementById("b_external") || []       
        fileExternal.onchange = () => {
            const reader = new FileReader();
            const dataFile = fileExternal.files[0];

            reader.readAsText(dataFile,"UTF-8")
            reader.onload = ()=>{

                const header = reader.result.split("\n")[0].split("\t")
                const indexID = header.indexOf("ID") === -1 ? header.indexOf("FINNGENID") : header.indexOf("ID")
                
                var newDataExternal = []
                const rows = reader.result.split("\n")
                rows.shift()
                rows.pop()
                rows.forEach(row => {
                    const rowID = row.split("\t")[indexID]
                    const rowFull = dataInitial.filter(datum => datum.FINNGENID === rowID)[0]
                    newDataExternal.push(rowFull)
                })

                setDataExternal(newDataExternal)
                setDataSelected(newDataExternal)
            }
        }

    }, [serverData, chr])

    return (
        
        <div id='v3c-body'>
            {
                dropPlot ? 
                <div> 
                    <p style={{color: 'red'}}>{errorMessage}</p> 
                </div> : null
            }
            {serverData.length !== 0 && dataTotal.length !== 0 && chr !== undefined && (<>
                <Header 
                    chr={chr} 
                    pos={pos} 
                    vRef={vRef} 
                    vAlt={vAlt} 
                    selectMode={selectMode}
                    manual={manual}
                    setManual={setManual}
                    />
                <Content 
                    dataInitial={dataInitial}
                    dataTotal={dataTotal}
                    setDataTotal={setDataTotal}
                    dataVisible={dataVisible}
                    setDataVisible={setDataVisible}
                    dataSelected={dataSelected}
                    setDataSelected={setDataSelected}
                    dataLocation={dataLocation}
                    setDataLocation={setDataLocation}
                    dataExternal={dataExternal}
                    chr={chr}
                    pos={pos}
                    vRef={vRef}
                    vAlt={vAlt}
                    selectMode={selectMode}
                    setSelectMode={setSelectMode}
                    manual={manual}
                    setManual={setManual}
                />
            </>)}
        </div>

    )
}

export default VariantClusterPlot;
