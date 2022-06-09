import React, { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Plot from 'react-plotly.js'
import { defaultLayout } from '../../config/plotConfig'
import { createAsyncThunk } from '@reduxjs/toolkit'
import * as d3 from 'd3'
import './v3c.css'


export const VariantClusterPlot = () => {

    const variant = useSelector(state => state.data.variants);
    const varname = variant[0].replaceAll('-', '_');
    const [status, setData] = useState(null);
    const [data, setIntensityData] = useState(null);
    const [error, setError] = useState(null);

    let vizWidth = window.innerWidth;
    let vizHeight = window.innerHeight;

    //let svg_height = vizHeight - 285;
    // let svg_width = vizWidth - 820;
    let svg_height = 800;
    let svg_width = 800;
    let m = 8;
    let u = svg_height/12;
    let x_axis = svg_width - u - m;
    let y_axis = svg_height - u - m;

    // add error handling here!
    useEffect (() => {
        const getData = async () => { 
            try {
                const response = await fetch('/api/v1/clusterplot/' + variant);
                if (response.status == 404){
                    throw new Error('ERROR 404');
                } else if (response.status == 400){
                    throw new Error('ERROR 400');
                } else if (response.status == 500){
                    throw new Error('ERROR 500');
                }
                setData(response.status);
                const server_data = await response.blob();

                // process blob from server
                const reader = new FileReader();
                reader.readAsText(server_data,"UTF-8")
                reader.onload = () => {
                const data_reader = reader.result
                    .split("\n")
                    .slice(1)
                    .map(e=>{
                        const values = e.split("\t");
                        return {
                            "FINNGENID":       values[0],
                            "batch":           values[1],
                            "sex":             values[2],
                            "intensity_ref":   parseFloat(values[3]),
                            "intensity_alt":   parseFloat(values[4]),
                            "raw":             parseFloat(values[5]),
                            "imputed":         parseFloat(values[6]),
                            "exome":           parseFloat(values[8]),
                            "COHORT_SOURCE":   "V3C_v3",
                            "COHORT_NAME":     varname,
                }})

                var dataFilt = data_reader.filter(e => typeof e.batch === 'string')
                setIntensityData(dataFilt)
                }
            } catch(err){
                setError(err.message);
            }
        }
        getData();
    }, [])

    // build svg
    useEffect(()=> {

        if (data !== null){
            d3.select('#graph').classed('transparent', false)
            d3.select('#table').classed('transparent', false)
            d3.select('#panel').classed('transparent', false)
            drawChart(data, varname)
        } 

        function drawChart(data_initial, data_current_filename, ref){
        
            var filename_array = data_current_filename.split('_'),
                chr = filename_array[0],
                pos = filename_array[1],
                ref = filename_array[2],
                alt_tmp = filename_array[3],
                alt = alt_tmp.replace(/\.[^.]*$/, '')

            var color00 = '#F5FbF9',
                color01 = '#B044B8',
                color02 = '#81E203',
                color03 = '#EF5117',
                color04 = '#AAAAAA',
                color05 = '#FFC2E0',
                color06 = '#27CFE3',
                color08 = '#FAF9F7';

            const d =     new Date();
            let year =    d.getFullYear(),
                month =   d.getMonth(),
                day =     d.getDate(),
                hours =   d.getHours(),
                minutes = d.getMinutes(),
                myDate =  year + "-" + month + "-" + day + '_' + hours + "-" + minutes;
            

            var arrayOfClickedSpots = [];

            var data_total = data_initial,
                data_visible = data_total,
                data_selection = [];

            var dataBatch_Keys   = Array.from(d3.rollup(data_total, v => v.length, d => d.batch).keys()),
                dataSex_Keys     = Array.from(d3.rollup(data_total, v => v.length, d => d.sex).keys()),
                dataRaw_Keys     = Array.from(d3.rollup(data_total, v => v.length, d => d.raw).keys()),
                dataImputed_Keys = Array.from(d3.rollup(data_total, v => v.length, d => d.imputed).keys()),
                dataExome_Keys   = Array.from(d3.rollup(data_total, v => v.length, d => d.exome).keys()),
                dataManual_Keys  = [2, 1, 0, -1, undefined];

            let visibility = {
                batch:     [],
                sex:       [],
                raw:       [],
                imputed:   [],
                exome:     [],
                manual:    [],
            }

            var extent_ref = d3.extent(data_total, d => d.intensity_ref),
                extent_alt = d3.extent(data_total, d => d.intensity_alt),
                zoom_k = 1,
                zoom_x = 0,
                zoom_y = 0,
                zoom_extent_x = [(extent_ref[0] + zoom_x) / zoom_k, (extent_ref[1] + zoom_x) / zoom_k],
                zoom_extent_y = [(extent_alt[0] + zoom_y) / zoom_k, (extent_alt[1] + zoom_y) / zoom_k];

            let cx = d3.scaleLog().domain(zoom_extent_x).range([u, x_axis + u]),
                cy = d3.scaleLog().domain(zoom_extent_y).range([y_axis, m]);
            
            function rename(a){
                if      (a === 0)         return ref + ref;
                else if (a === 1)         return ref + alt;
                else if (a === 2)         return alt + alt;
                else if (a === -1)        return 'No call';
                else if (a === '-1')      return 'No call';
                else if (a === null)      return 'Null'; 
                else if (a === 'male')    return 'Male';
                else if (a === 'female')  return 'Female';
                else if (a === undefined) return 'Null';
                else                      return 'Null'
            };

            function renameBatch(a){
                while(a.charAt(0) === 'b')
                {a = a.substring(1);}
                return a
            }

            function colorCalls(a){
                if (a === 0) return color03
                else if (a === 1) return color02
                else if (a === 2) return color01
                else return color04;
            };

            function colorSex(a){
                if      (a === 'male')   return color06
                else if (a === 'female') return color05
                else                     return color04
            };

            //Header
            function drawHeader(){
                d3.select('#v3c-body').style('background-color', '#FAF9F7');
                // commented out by sanastas: d3.select('#header').style('position', 'static').style('transform', 'none').style('top', 'none').style('float', 'left');
                d3.select('#h_description').style('margin', '0px').style('float', 'left')
                    .select('p').html('Chromosome: <b>' + chr + '</b>&nbsp;&nbsp;&nbsp;Position: <b>' + pos + '</b>&nbsp;&nbsp;&nbsp;Reference: <b>' + ref + '</b>&nbsp;&nbsp;&nbsp;Alternative: <b>' + alt + '</b>');
            }

            //GRAPH
            //Heading
            function drawCount(a, c){
                var dataSex_Keys = Array.from(d3.rollup(a, v => v.length, d => d.sex).keys()),
                    dataSex_Values = Array.from(d3.rollup(a, v => v.length, d => d.sex).values()),
                    dataSex = dataSex_Keys.map((type, index) => {return {type: type, value: dataSex_Values[index],}});

                var dataRaw_Keys = Array.from(d3.rollup(a, v => v.length, d => d.raw).keys()),
                    dataRaw_Values = Array.from(d3.rollup(a, v => v.length, d => d.raw).values()),
                    dataRaw = dataRaw_Keys.map((type, index) => {return {type: type, value: dataRaw_Values[index],}});

                var dataImputed_Keys = Array.from(d3.rollup(a, v => v.length, d => d.imputed).keys()),
                    dataImputed_Values = Array.from(d3.rollup(a, v => v.length, d => d.imputed).values()),
                    dataImputed = dataImputed_Keys.map((type, index) => {return {type: type, value: dataImputed_Values[index],}});

                var dataExome_Keys = Array.from(d3.rollup(a, v => v.length, d => d.exome).keys()),
                    dataExome_Values = Array.from(d3.rollup(a, v => v.length, d => d.exome).values()),
                    dataExome = dataExome_Keys.map((type, index) => {return {type: type, value: dataExome_Values[index],}});

                var dataManual_Keys = Array.from(d3.rollup(a, v => v.length, d => d.manual).keys()),
                    dataManual_Values = Array.from(d3.rollup(a, v => v.length, d => d.manual).values()),
                    dataManual = dataManual_Keys.map((type, index) => {return {type: type, value: dataManual_Values[index],}});
                
                dataRaw.sort(function(a, b){
                    if(a.type < b.type) {return 1;}
                    if(a.type > b.type) {return -1;}
                    return 0;
                })

                dataImputed.sort(function(a, b){
                    if(a.type < b.type) {return 1;}
                    if(a.type > b.type) {return -1;}
                    return 0;
                }) 

                dataExome.sort(function(a, b){
                    if(a.type < b.type) {return 1;}
                    if(a.type > b.type) {return -1;}
                    return 0;
                })

                dataManual.sort(function(a, b){
                    if(a.type < b.type) {return 1;}
                    if(a.type > b.type) {return -1;}
                    return 0;
                })

                d3.select('#' + c).select('.count').selectAll('div').remove();
                var b;

                if      (d3.select('#p_color_sex').classed('button_active'))       b = dataSex
                else if (d3.select('#p_color_raw').classed('button_active'))       b = dataRaw
                else if (d3.select('#p_color_imputed').classed('button_active'))   b = dataImputed
                else if (d3.select('#p_color_exome').classed('button_active'))     b = dataExome
                else if (d3.select('#p_color_manual').classed('button_active'))    b = dataManual

                var g_heading = d3.select('#' + c).select('.count').selectAll('div')
                    .data(b).enter().append('div')
                
                g_heading.append('div')
                    .attr('class', 'g_heading_circle')
                    .style('background-color', function(d,i){
                        if (d3.select('#p_color_sex').classed('button_active')) return colorSex(d.type)
                        else return colorCalls(d.type)
                    });
                
                g_heading.append('p')
                    .attr('class', 'g_heading_key')
                    .text(function(d,i){return rename(d.type)});

                g_heading.append('p')
                    .attr('class', 'g_heading_value')
                    .text(function(d){return d.value});
            }

            var g_svg = d3.select('#graph').select('svg')
                .style('background-color', '#EDECEA')
                .style('cursor', 'grab')
                .on('mouseenter', function(){d3.selectAll('.b_zoom_controllers').style('opacity', '1');})
                .on('mouseleave', function(){d3.selectAll('.b_zoom_controllers').style('opacity', '0');})
                
            g_svg.call(d3.zoom().on("zoom", e => {
                if (d3.select('#b_selection_new').classed('button_active')) return null
                else {
                    zoom_x = e.transform.x;
                    zoom_y = e.transform.y;

                    zoom_extent_x = [(extent_ref[0] - zoom_x*5) / zoom_k, (extent_ref[1] - zoom_x) / zoom_k];
                    zoom_extent_y = [(extent_alt[0] + zoom_y*5) / zoom_k, (extent_alt[1] + zoom_y) / zoom_k];

                    arrayOfClickedSpots = []

                    if (zoom_extent_x[0] < 1) zoom_extent_x[0] = 1;
                    if (zoom_extent_y[0] < 1) zoom_extent_y[0] = 1;
                
                    cx = d3.scaleLog().domain(zoom_extent_x).range([u, x_axis + u]);
                    cy = d3.scaleLog().domain(zoom_extent_y).range([y_axis, m]);

                    g_svg.style('cursor', 'grab');

                    d3.select('#b_zoom_reset').classed('transparent', false)
                    d3.select('#g_axis').remove();
                    drawAxes();
                    drawDots(data_visible);
                    drawExomeLocations();
                }
            }));

            //Graph buttons
            d3.select('#b_selection_filtered').data(data_total).on("click",function(){
                zoom_k = 1;
                zoom_x = 0;
                zoom_y = 0;
                zoom_extent_x = [(extent_ref[0] + zoom_x) / zoom_k, (extent_ref[1] + zoom_x) / zoom_k];
                zoom_extent_y = [(extent_alt[0] + zoom_y) / zoom_k, (extent_alt[1] + zoom_y) / zoom_k];
                cx = d3.scaleLog().domain(zoom_extent_x).range([u, x_axis + u]);
                cy = d3.scaleLog().domain(zoom_extent_y).range([y_axis, m]);
                
                d3.select(this).classed('button_active', true)
                
                data_selection = data_visible;
                arrayOfClickedSpots = [];

                d3.select('#b_zoom_k').html('x1')
                d3.select('#b_zoom_reset').classed('transparent', true);
                d3.select('#b_selection_add').classed('transparent', true);
                d3.select('#t_rows').selectAll('div').remove();
                d3.select('#t_sums').selectAll('rect').remove();
                d3.select('#t_table').classed('transparent', false);
                d3.select('#t_manual_add').classed('transparent', false);
                d3.select('#t_message').classed('transparent', true);
                d3.select('#table').selectAll('.heading').classed('transparent', false);
                eraseSelection();
                drawRows(data_selection);
                drawSums(data_selection);
                drawCount(data_visible, 'graph');
                drawDots(data_visible);
            })

            d3.select('#b_selection_new').data(data_total).on("click",function(){
                if (d3.select(this).classed('button_active')) {
                    d3.select(this).classed('button_active', false).html('New selection');
                    
                    d3.selectAll('.g_dots_selected').each(function(d){data_selection.push(d)});
                    d3.select('#t_table').classed('transparent', false);
                    d3.select('#t_manual_add').classed('transparent', false);
                    d3.select('#t_message').classed('transparent', true);
                    d3.select('#table').selectAll('.heading').classed('transparent', false);
                    d3.select('#g_alert').classed('transparent', true);
                    d3.select('#b_selection_undo').classed('transparent', true);
                    d3.select('#b_selection_filtered').classed('transparent', false);
                    d3.select('#b_selection_add').classed('transparent', false);
                    d3.select('#b_export_chart').classed('transparent', false);
                    d3.selectAll('.b_zoom_controllers').classed('transparent', false);
                    d3.select('#b_zoom_reset').classed('transparent', function(){
                        if (zoom_k === 1 && zoom_x === 0 & zoom_y === 0) return true
                        else return false
                    })
                    d3.select('v3c-label').classed('transparent', false)
                    d3.select('#b_reset').classed('transparent', false)
                    d3.select('#v3c-body').style('background-color', color08);
                    d3.select('#header').style('background-color', '#000');
                    d3.select('#header').select('p').style('color', '#fff');
                    
                    drawRows(data_selection);
                    drawSums(data_selection);
                    drawCount(data_visible, 'graph');

                    g_svg.select('.g_selection_path').remove();
                    g_svg.select('.g_selection_dots').remove();
                    g_svg.style('cursor', 'grab')
                }
                else {
                    d3.select(this).classed('button_active', true).html('Confirm selection');
                    d3.select('v3c-label').classed('transparent', true)
                    d3.select('#b_reset').classed('transparent', true)
                    d3.select('#b_export_chart').classed('transparent', true);
                    d3.select('#b_export_chart').classed('button_active', false);
                    d3.select('#b_export_chart_svg').classed('transparent', true);
                    d3.select('#b_export_chart_jpg').classed('transparent', true);
                    d3.select('#b_export_data').classed('button_active', false);
                    d3.select('#b_export_data_all').classed('transparent', true);
                    d3.select('#b_export_data_selection').classed('transparent', true);
                    d3.selectAll('.b_zoom_controllers').classed('transparent', true);
                    d3.select('#b_selection_undo').classed('transparent', false)
                    d3.select('#b_selection_filtered').classed('button_active', false).classed('transparent', true);
                    d3.select('#b_selection_add').classed('transparent', true);
                    d3.select('#b_zoom_reset').classed('transparent', true)
                    d3.select('#graph').select('.count').selectAll('div').remove();
                    d3.select('#g_alert').classed('transparent', false);
                    d3.select('#v3c-body').style('background-color', '#C2C2C2');
                    d3.select('#header').style('background-color', '#777');
                    d3.select('#header').select('p').style('color', '#bbb');
                    d3.select('#t_table').classed('transparent', true);
                    d3.select('#t_message').classed('transparent', false);
                    d3.select('#t_manual_add').classed('transparent', true);
                    d3.select('#table').selectAll('.heading').classed('transparent', true);
                    

                    data_selection = [];
                    arrayOfClickedSpots = [];

                    eraseTable();
                    eraseSelection();

                    g_svg.append('path').attr('class', 'g_selection_path')
                    g_svg.append('g').attr('class', 'g_selection_dots')
                    g_svg.style('cursor', 'crosshair')
            }})

            d3.select('#b_selection_add').data(data_total).on("click",function(){
                if (d3.select(this).classed('button_active')) {
                    d3.select(this).classed('button_active', false).html('Add dots');

                    d3.selectAll('.g_dots_selected').each(function(d){
                        let current_ID = d.FINNGENID;
                        let data_selection_id = data_selection.map(a => a.FINNGENID);
                        
                        if (!data_selection_id.includes(current_ID)) {
                            data_selection.push(d);
                        }
                    })
                    d3.select('#g_alert').classed('transparent', true);
                    d3.select('#b_selection_new').classed('transparent', false).classed('button_active', false);
                    d3.select('#b_selection_undo').classed('transparent', true)
                    d3.select('#b_selection_filtered').classed('transparent', false)
                    d3.select('#b_export_chart').classed('transparent', false);
                    d3.selectAll('.b_zoom_controllers').classed('transparent', false);
                    d3.select('#b_zoom_reset').classed('transparent', function(){
                        if (zoom_k === 1 && zoom_x === 0 & zoom_y === 0) return true
                        else return false
                    })
                    d3.select('v3c-label').classed('transparent', false)
                    d3.select('#b_reset').classed('transparent', false)
                    d3.select('#v3c-body').style('background-color', color08);
                    d3.select('#header').style('background-color', '#000');
                    d3.select('#header').select('p').style('color', '#fff');

                    eraseTable();
                    drawRows(data_selection);
                    drawSums(data_selection);
                    drawCount(data_visible, 'graph');

                    g_svg.select('.g_selection_path').remove();
                    g_svg.select('.g_selection_dots').remove();
                    g_svg.style('cursor', 'grab')
                }
                else {
                    d3.select(this).classed('button_active', true).html('Add selected dots');
                    d3.select('v3c-label').classed('transparent', true)
                    d3.select('#b_reset').classed('transparent', true)
                    d3.select('#b_export_chart').classed('transparent', true).classed('button_active', false);
                    d3.select('#b_export_chart_svg').classed('transparent', true);
                    d3.select('#b_export_chart_jpg').classed('transparent', true);
                    d3.select('#b_export_data').classed('button_active', false);
                    d3.select('#b_export_data_all').classed('transparent', true);
                    d3.select('#b_export_data_selection').classed('transparent', true);
                    d3.selectAll('.b_zoom_controllers').classed('transparent', true);
                    d3.select('#b_selection_new').classed('transparent', true).classed('button_active', true);
                    d3.select('#b_selection_undo').classed('transparent', false)
                    d3.select('#b_selection_filtered').classed('button_active', false).classed('transparent', true)
                    d3.select('#b_zoom_reset').classed('transparent', true)
                    d3.select('#graph').select('.count').selectAll('div').remove();
                    d3.select('#g_alert').classed('transparent', false);
                    d3.select('#v3c-body').style('background-color', '#C2C2C2');
                    d3.select('#header').style('background-color', '#777');
                    d3.select('#header').select('p').style('color', '#bbb');

                    arrayOfClickedSpots = [];

                    g_svg.select('.g_selection_path').remove();
                    g_svg.select('.g_selection_dots').remove();
                    g_svg.append('path').attr('class', 'g_selection_path')
                    g_svg.append('g').attr('class', 'g_selection_dots')
                    g_svg.style('cursor', 'crosshair')
                }
            })

            d3.select('#b_selection_undo').data(data_total).on('click', function(){
                arrayOfClickedSpots = [];
                data_selection = [];

                d3.select(this).classed('transparent', true)
                
                d3.selectAll('.g_dots_selected').classed('g_dots_selected', false);
                d3.select('#g_alert').classed('transparent', true);
                d3.select('#b_selection_new').classed('transparent', false).classed('button_active', false).html('New selection');
                d3.select('#b_selection_filtered').classed('transparent', false);
                d3.select('#b_selection_add').classed('transparent', function(){
                    if (d3.select('#t_table').classed('transparent')) return true
                    else return false}).classed('button_active', false)
                d3.select('#b_export_chart').classed('transparent', false);
                d3.selectAll('.b_zoom_controllers').classed('transparent', false);
                d3.select('#b_zoom_reset').classed('transparent', function(){
                        if (zoom_k === 1 && zoom_x === 0 & zoom_y === 0) return true
                        else return false
                    })
                d3.select('v3c-label').classed('transparent', false)
                d3.select('#b_reset').classed('transparent', false)
                d3.select('#v3c-body').style('background-color', color08);
                d3.select('#t_sums').selectAll('svg').style('background-color', color08);
                d3.select('#header').style('background-color', '#000');
                d3.select('#header').select('p').style('color', '#fff');
                    
                drawRows(data_selection);
                drawSums(data_selection);
                drawCount(data_visible, 'graph');

                g_svg.select('.g_selection_path').remove();
                g_svg.select('.g_selection_dots').remove();
                g_svg.style('cursor', 'default')
                })

            d3.select('#b_export_chart').on('click', function(){
                if (d3.select(this).classed('button_active')) {
                    d3.select(this).classed('button_active', false).style('margin-right', '0').html('Export chart');
                    d3.select('#b_export_chart_svg').classed('transparent', true);
                    d3.select('#b_export_chart_jpg').classed('transparent', true);
                } else {
                    d3.select(this).classed('button_active', true).style('margin-right', '4px').html('X');
                    d3.select('#b_export_chart_svg').classed('transparent', false);
                    d3.select('#b_export_chart_jpg').classed('transparent', false);
                }
            })
            
            d3.select('#b_export_chart_svg').on('click', function(){
                const svg = document.querySelector('svg').cloneNode(true);
                document.body.appendChild(svg);
                svg.setAttribute('width', svg.getBoundingClientRect().width)
                svg.setAttribute('height', svg.getBoundingClientRect().height + 20)
                svg.setAttribute('class', 'transparent')

                const source = (new XMLSerializer).serializeToString(svg);
                const image = `data:image/svg+xml,${encodeURIComponent(source)}`

                const link = document.getElementById("a_export_chart_svg")
                link.setAttribute("href", image);
                link.setAttribute("download", "chart_" + chr + "_" + pos + "_" + ref + "_" + alt + "_export_"+ myDate + ".svg");
            })

            d3.select('#b_export_chart_jpg').on('click', function(){
                const svg = d3.select("svg").node();
                var width = svg.getBoundingClientRect().width,
                    height = svg.getBoundingClientRect().height;
              
                const source = new XMLSerializer().serializeToString(svg);
                var DOMURL = window.self.URL || window.self.webkitURL || window.self;
                var img = new Image();
                var svgAbs = new Blob([source], {type: "image/svg+xml;charset=utf-8"});
                var url = DOMURL.createObjectURL(svgAbs);

                img.onload = function() {
                    let canvas = document.createElement('canvas')
                    canvas.width = width;
                    canvas.height = height;
                    var context = canvas.getContext("2d");
                    context.drawImage(img, 0, 0);
                    var image = canvas.toDataURL("image/jpeg", 1.0);

                    const link = document.getElementById("a_export_chart_jpg")
                    link.setAttribute("href", image)
                    link.setAttribute("download", "chart_" + chr + "_" + pos + "_" + ref + "_" + alt + "_export_"+ myDate + ".jpg")
                };
                img.src = url;
            })

            d3.select('#b_zoom_reset').on('click', function(){
                zoom_k = 1;
                zoom_x = 0;
                zoom_y = 0;
                zoom_extent_x = [extent_ref[0], extent_ref[1]];
                zoom_extent_y = [extent_alt[0], extent_alt[1]];
                cx = d3.scaleLog().domain(zoom_extent_x).range([u, x_axis + u]);
                cy = d3.scaleLog().domain(zoom_extent_y).range([y_axis, m]);

                arrayOfClickedSpots = []
                
                d3.select('#b_zoom_k').html('x1')
                d3.select('#g_axis').remove();
                drawAxes();
                drawDots(data_visible);
                drawExomeLocations();
                d3.select(this).classed('transparent', true)
            })

            d3.select('#b_zoom_more').on('click', function(){
                zoom_k = zoom_k*1.5;
                zoom_extent_x = [(extent_ref[0] + zoom_x*5) / zoom_k, (extent_ref[1] + zoom_x) / zoom_k];
                zoom_extent_y = [(extent_alt[0] + zoom_y*5) / zoom_k, (extent_alt[1] + zoom_y) / zoom_k];
                
                arrayOfClickedSpots = []

                if (zoom_extent_x[0] < 1) zoom_extent_x[0] = 1;
                if (zoom_extent_y[0] < 1) zoom_extent_y[0] = 1;
                
                cx = d3.scaleLog().domain(zoom_extent_x).range([u, x_axis + u]);
                cy = d3.scaleLog().domain(zoom_extent_y).range([y_axis, m]);

                d3.select('#b_zoom_k').html('x' + Math.round(zoom_k* 100)/100)
                d3.select('#g_axis').remove();
                drawAxes();
                drawExomeLocations();
                drawDots(data_visible);
            })

            d3.select('#b_zoom_less').on('click', function(){
                zoom_k = zoom_k*0.75;
                zoom_extent_x = [(extent_ref[0] + zoom_x*5) / zoom_k, (extent_ref[1] + zoom_x) / zoom_k];
                zoom_extent_y = [(extent_alt[0] + zoom_y*5) / zoom_k, (extent_alt[1] + zoom_y) / zoom_k];
                
                arrayOfClickedSpots = []

                if (zoom_extent_x[0] < 1) zoom_extent_x[0] = 1;
                if (zoom_extent_y[0] < 1) zoom_extent_y[0] = 1;
                
                cx = d3.scaleLog().domain(zoom_extent_x).range([u, x_axis + u]);
                cy = d3.scaleLog().domain(zoom_extent_y).range([y_axis, m]);

                d3.select('#b_zoom_k').html('x' + Math.round(zoom_k* 100)/100)
                d3.select('#g_axis').remove();
                drawAxes();
                drawExomeLocations();
                drawDots(data_visible);
            })

            d3.select('.g_zoom_buttons')
                .on('mouseenter', function(){d3.selectAll('.b_zoom_controllers').style('opacity', '1');})
                .on('mouseleave', function(){d3.selectAll('.b_zoom_controllers').style('opacity', '0');});

            //Svg
            function drawAxes(){
                d3.select('#graph').style('width', svg_width + 'px').style('height', svg_height + 111 + 'px')
                g_svg.attr('height', svg_height).attr('width', svg_width)

                var g_axis = g_svg.append('g').attr('id' , 'g_axis'),
                    g_axis_x_translation = svg_height - 50,
                    g_axis_y_translation = 43;

                var g_axis_x = d3.axisBottom().scale(cx).ticks(6, "~s");
                var g_axis_y = d3.axisLeft().scale(cy).ticks(6, "~s");
                g_axis.append('g').attr('id', 'g_axis_x').attr('transform', 'translate(0, ' + g_axis_x_translation + ')').call(g_axis_x)
                g_axis.append('g').attr('id', 'g_axis_y').attr('transform', 'translate(' + g_axis_y_translation + ', 0)').call(g_axis_y)

                g_axis.append('text')
                    .attr('x', u + x_axis/2)
                    .attr('y', y_axis + u/1.4 + m)
                    .attr('text-anchor', 'middle')
                    .style('font-family', 'Helvetica')
                    .style('font-size', '15')
                    .html(ref + ' intensity')

                g_axis.append('text')
                    .attr('x', u/4.5)
                    .attr('y', y_axis/2)
                    .attr('text-anchor', 'middle')
                    .style('transform','rotate(-90deg)')
                    .style('transform-box','fill-box')
                    .style('transform-origin','center')
                    .style('font-family', 'Helvetica')
                    .style('font-size', '15')
                    .html(alt + ' intensity')
            }
            
            function drawDots(a){

                var g_dots = g_svg.select('#g_dots').selectAll('circle').data(a)

                g_dots.exit().remove();
                g_dots.enter().append('circle');

                d3.selectAll('circle')
                    .data(a)
                    .attr('cx',     function(d){return cx(d.intensity_ref)})
                    .attr('cy',     function(d){return cy(d.intensity_alt)})
                    .attr('r', 3)
                    .style('fill',  function(d){
                        if      (d3.select('#p_color_raw').classed('button_active'))        return colorCalls(d.raw)
                        else if (d3.select('#p_color_imputed').classed('button_active'))    return colorCalls(d.imputed)
                        else if (d3.select('#p_color_sex').classed('button_active'))             return colorSex(d.sex)
                        else if (d3.select('#p_color_manual').classed('button_active'))     return colorCalls(d.manual)
                        else if (d3.select('#p_color_exome').classed('button_active'))           return colorCalls(d.exome)
                    })
                    .attr('class',  function(d){return 'g_dots'})
                    .attr('id', function(d){return d.FINNGENID + '-circle'})
                    .on('click', function(e, d){
                        drawSpecification(d)
                        if (d3.select(this).classed('g_dots g_dots_selected')) drawRemoveButton(d)
                        else drawAddButton(d)
                    })
                    .classed('transparent', function(d){if (d.intensity_ref < zoom_extent_x[0] || d.intensity_alt < zoom_extent_y[0]) return true})

                if (arrayOfClickedSpots.length > 2){
                    d3.selectAll('circle').classed('g_dots_selected', function(d){
                        if (d3.polygonContains(arrayOfClickedSpots, [cx(d.intensity_ref), cy(d.intensity_alt)]))
                        return true})
                }
            }

            function colorDots(){
                d3.selectAll('circle').data(data_visible)
                    .style('fill', function(d){ 
                        if      (d3.select('#p_color_raw').classed('button_active'))        return colorCalls(d.raw)
                        else if (d3.select('#p_color_imputed').classed('button_active'))    return colorCalls(d.imputed)
                        else if (d3.select('#p_color_sex').classed('button_active'))             return colorSex(d.sex)
                        else if (d3.select('#p_color_manual').classed('button_active'))     return colorCalls(d.manual)
                        else if (d3.select('#p_color_exome').classed('button_active'))           return colorCalls(d.exome)
                    })
                    .classed('g_dots_selected', function(d){if (d3.polygonContains(arrayOfClickedSpots, [cx(d.intensity_ref), cy(d.intensity_alt)])) return true})
            }

            function drawExomeLocations(){

                var dataExome_Only = data_initial.filter(el => el.exome > -1);

                var g_exomelocations = g_svg.select('#g_exomelocations').selectAll('rect').data(dataExome_Only)

                g_exomelocations.exit().remove();
                g_exomelocations.enter().append('rect');

                d3.selectAll('rect')
                    .data(dataExome_Only)
                    .attr('x',     function(d){return cx(d.intensity_ref) -1})
                    .attr('y',     function(d){return cy(d.intensity_alt) -1})
                    .attr('class', function(d){return 'g_exomelocations'})
                    .classed('transparent', function(d){if (d.intensity_ref < zoom_extent_x[0] || d.intensity_alt < zoom_extent_y[0]) return true})
            }

            drawAxes();
            drawCount(data_visible, 'graph');
            drawCount(data_selection, 'table');
            drawHeader();
            drawDots(data_total);
            drawExomeLocations();

            //Click specification
            function drawSpecification(d){
                d3.select('svg').append('circle')
                    .attr('cx', cx(d.intensity_ref))
                    .attr('cy', cy(d.intensity_alt))
                    .attr('r', 3)
                    .attr('class', 'g_dots_click')
                    .attr('id', d.FINNGENID + '-hovercircle')

                var g_rect = d3.select('#v3c-body').append('div')
                    .attr('class', 'g_rect')
                    .attr('id', function(){return d.FINNGENID + '-div'})
                    .style('left', function(){return cx(d.intensity_ref) + 17 + 'px'})
                    .style('top', function(){return cy(d.intensity_alt) + 75 + 'px'});

                var g_exit = g_rect.append('svg')
                    .style('position', 'absolute')
                    .style('right', m)
                    .style('background-color', '#fff')
                    .style('width', m + 'px')
                    .style('height', m + 'px')
                    .attr('id', function(){return d.FINNGENID})
                    .on('click', function(){
                        d3.select(this.parentNode).remove()
                        d3.select('#' + d.FINNGENID + '-hovercircle').remove()
                    });
                
                g_exit.append('line')
                    .attr('class', 'line')
                    .attr('x1', 0).attr('x2', m)
                    .attr('y1', 0).attr('y2', m);
            
                g_exit.append('line')
                    .attr('class', 'line')
                    .attr('x1', m).attr('x2', 0)
                    .attr('y1', 0).attr('y2', m);

                for (var i=0; i<7; i+=1){
                    g_rect.append('p')
                    .attr('class', 'g_heading_key')
                    .style('clear', 'both')
                    .text(function(i){
                        if (i===0){return 'FinnGen ID: '}
                        else if (i===1){return 'Batch: '}
                        else if (i===2){return 'Sex: '}
                        else if (i===3){return ref + ' intensity: '}
                        else if (i===4){return alt + ' intensity: '}
                        else if (i===5){return 'Raw call: '}
                        else if (i===6){return 'Imputed call: '}
                    })
                    g_rect.append('p')
                    .attr('class', 'g_heading_value')
                    .text(function(i){
                        if (i===0){return d.FINNGENID}
                        else if (i===1){return renameBatch(d.batch)}
                        else if (i===2){return rename(d.sex)}
                        else if (i===3){return d3.format(".2f")(d.intensity_ref)}
                        else if (i===4){return d3.format(".2f")(d.intensity_alt)}
                        else if (i===5){return rename(d.raw)}
                        else if (i===6){return rename(d.imputed)}
                    })
                }
            }

            function drawRemoveButton(a){
                d3.select('#' + a.FINNGENID + '-div').append('button')
                    .attr('class', 'button_specification')
                    .text('Remove from selection')
                    .on('click', function(){
                        var erased = a.FINNGENID;
                            data_selection = data_selection.filter(el => el.FINNGENID !== erased);
                        eraseTable();
                        drawRows(data_selection);
                        drawSums(data_selection);
                        drawCount(data_visible, 'graph');
                        drawAddButton(a)
                        d3.select(this).remove()
                        d3.select('#' + a.FINNGENID + '-circle').classed('g_dots_selected', false)
                })}

            function drawAddButton(a){
                d3.select('#' + a.FINNGENID + '-div').append('button')
                    .attr('class', 'button_specification')
                    .text('Add to selection')
                    .on('click', function(){
                        data_selection.push(a);
                        eraseTable();
                        drawRows(data_selection);
                        drawSums(data_selection);
                        drawCount(data_visible, 'graph');
                        drawRemoveButton(a)
                        d3.select(this).remove()
                        d3.select('#' + a.FINNGENID + '-circle').classed('g_dots_selected', true)
            })}

            // TABLE
            d3.select('#table').style('height', svg_height + 111 + 'px')
            d3.select('#t_rows').style('height', svg_height - 102 + 'px')
            d3.select('#t_manual_add').style('height', svg_height + 42 + 'px')
            
            var t_sum = d3.select('#t_sums')

            d3.select('#t_first_ref').text(ref + ' intensity');
            d3.select('#t_first_alt').text(alt + ' intensity');

            eraseTable();
            d3.select('#t_firstrow').select('.manual').classed('transparent', true);
            d3.select('#t_firstrow').select('#b_manual_add').classed('transparent', false);

            function eraseTable(){
                d3.select('#t_rows').selectAll('div').remove();
                d3.select('#t_sums').selectAll('rect').remove();
                t_sum.select('#t_sum_count').select('p').text('-');
                t_sum.select('#t_sum_ref').select('p').text('-');
                t_sum.select('#t_sum_alt').select('p').text('-');
                d3.select('#graph').select('.heading').selectAll('div').remove();
            }

            function drawRows(a){
                var t_row = d3.select('#t_rows').selectAll('div')
                    .data(a).enter()
                    .append('div').attr('class', 't_complete_row')
                
                t_row.append('div').attr('class', 't_row t_cell_l').html(function(d){return d.FINNGENID}).on('click', function(e, d){drawSpecification(d); drawRemoveButton(d);});
                t_row.append('div').attr('class', 't_row t_cell_s').html(function(d){return renameBatch(d.batch)}).on('click', function(e, d){drawSpecification(d); drawRemoveButton(d);});
                t_row.append('div').attr('class', 't_row t_cell_m sex').html(function(d){return rename(d.sex)}).on('click', function(e, d){drawSpecification(d); drawRemoveButton(d);});
                t_row.append('div').attr('class', 't_row t_cell_xl').html(function(d){return d3.format(".2f")(d.intensity_ref)}).on('click', function(e, d){drawSpecification(d); drawRemoveButton(d);});
                t_row.append('div').attr('class', 't_row t_cell_xl').html(function(d){return d3.format(".2f")(d.intensity_alt)}).on('click', function(e, d){drawSpecification(d); drawRemoveButton(d);});
                t_row.append('div').attr('class', 't_row t_cell_m raw').html(function(d){return rename(d.raw)}).on('click', function(e, d){drawSpecification(d); drawRemoveButton(d);});
                t_row.append('div').attr('class', 't_row t_cell_m imputed').html(function(d){return rename(d.imputed)}).on('click', function(e, d){drawSpecification(d); drawRemoveButton(d);});
                t_row.append('div').attr('class', 't_row t_cell_m exome').html(function(d){return rename(d.exome)}).on('click', function(e, d){drawSpecification(d); drawRemoveButton(d);});
                t_row.append('div').attr('class', 't_row t_cell_m manual').html(function(d){return rename(d.manual)})
                    .on('click', function(e, d){
                        var selected = d3.select(this).attr('data-selected') === 'selected'
                        if (!selected) {
                            d3.select(this).text('')
                            addManualCall(this)
                        }
                    })
                    .classed('transparent', document.body.contains(document.getElementById("b_manual_add")))

                t_row.select('.sex').append('div').attr('class', 't_table_circle').style('background-color', function(d){return colorSex(d.sex)});
                t_row.select('.raw').append('div').attr('class', 't_table_circle').style('background-color', function(d){return colorCalls(d.raw)});
                t_row.select('.imputed').append('div').attr('class', 't_table_circle').style('background-color', function(d){return colorCalls(d.imputed)});
                t_row.select('.exome').append('div').attr('class', 't_table_circle').style('background-color', function(d){return colorCalls(d.exome)});
                t_row.select('.manual').append('div').attr('class', 't_table_circle').style('background-color', function(d){return colorCalls(d.manual)});

                t_row.on('mouseover', function(e, d){
                    d3.select('svg').append('circle')
                        .attr('cx', cx(d.intensity_ref))
                        .attr('cy', cy(d.intensity_alt))
                        .attr('class', 'g_dots_hover')
                    d3.select('svg').append('line')
                        .style('stroke-width','0.25px')
                        .style('stroke', '#000')
                        .attr('x1', cx(d.intensity_ref)).attr('x2', cx(d.intensity_ref))
                        .attr('y1', 0).attr('y2', y_axis + m)
                        .attr('class', 'g_dots_hover');
                    d3.select('svg').append('line')
                        .style('stroke-width','0.25px')
                        .style('stroke', '#000')
                        .attr('x1', u).attr('x2', x_axis + u + m)
                        .attr('y1', cy(d.intensity_alt)).attr('y2', cy(d.intensity_alt))
                        .attr('class', 'g_dots_hover');
                })

                t_row.on('mouseout', function(){
                    d3.selectAll('.g_dots_hover').remove();
                })
            }

            function drawSums(a){
                var dataSex_Keys = Array.from(d3.rollup(a, v => v.length, d => d.sex).keys()),
                    dataSex_Values = Array.from(d3.rollup(a, v => v.length, d => d.sex).values()),
                    dataSex = dataSex_Keys.map((type, index) => {return {type: type, value: dataSex_Values[index],}});

                var dataRaw_Keys = Array.from(d3.rollup(a, v => v.length, d => d.raw).keys()),
                    dataRaw_Values = Array.from(d3.rollup(a, v => v.length, d => d.raw).values()),
                    dataRaw = dataRaw_Keys.map((type, index) => {return {type: type, value: dataRaw_Values[index],}});

                var dataImputed_Keys = Array.from(d3.rollup(a, v => v.length, d => d.imputed).keys()),
                    dataImputed_Values = Array.from(d3.rollup(a, v => v.length, d => d.imputed).values()),
                    dataImputed = dataImputed_Keys.map((type, index) => {return {type: type, value: dataImputed_Values[index],}});

                var dataExome_Keys = Array.from(d3.rollup(a, v => v.length, d => d.Exome).keys()),
                    dataExome_Values = Array.from(d3.rollup(a, v => v.length, d => d.Exome).values()),
                    dataExome = dataExome_Keys.map((type, index) => {return {type: type, value: dataExome_Values[index],}});

                var max_sex     = d3.max(dataSex, d => d.value),
                    max_raw     = d3.max(dataRaw, d => d.value),
                    max_imputed = d3.max(dataImputed, d => d.value),
                    max_exome   = d3.max(dataExome, d => d.value);

                t_sum.select('#t_sum_count').select('p').text(function(){return a.length})
                t_sum.select('#t_sum_sex').select('svg').selectAll('rect').data(dataSex).enter().append('rect')
                    .attr('x', 0)
                    .attr('y', function(d,i){return i*10})
                    .attr('width', function(d){return d.value/max_sex*100})
                    .attr('height', function(d){return 10})
                    .attr('fill', function(d){return colorSex(d.type)})
                t_sum.select('#t_sum_ref').select('p').text(function(){return d3.format(".2f")(d3.sum(a, item => item.intensity_ref) / a.length)})
                t_sum.select('#t_sum_alt').select('p').text(function(){return d3.format(".2f")(d3.sum(a, item => item.intensity_alt) / a.length)})
                t_sum.select('#t_sum_raw').select('svg').selectAll('rect').data(dataRaw).enter().append('rect')
                    .attr('x', 0)
                    .attr('y', function(d,i){return i*10})
                    .attr('width', function(d){return d.value/max_raw*100})
                    .attr('height', function(d){return 10})
                    .attr('fill', function(d){return colorCalls(d.type)})
                t_sum.select('#t_sum_imputed').select('svg').selectAll('rect').data(dataImputed).enter().append('rect')
                    .attr('x', 0)
                    .attr('y', function(d,i){return i*10})
                    .attr('width', function(d){return d.value/max_imputed*100})
                    .attr('height', function(d){return 10})
                    .attr('fill', function(d){return colorCalls(d.type)})
                t_sum.select('#t_sum_exome').select('svg').selectAll('rect').data(dataExome).enter().append('rect')
                    .attr('x', 0)
                    .attr('y', function(d,i){return i*10})
                    .attr('width', function(d){return d.value/max_exome*100})
                    .attr('height', function(d){return 10})
                    .attr('fill', function(d){return colorCalls(d.type)})

                drawCount(data_selection, 'table');
            }

            // Table buttons
            d3.select('#b_export_data').on('click', function(){
                if (d3.select(this).classed('button_active')) {
                    d3.select(this).classed('button_active', false).style('margin-right', '0').html('Export data');
                    d3.select('#b_export_data_selection').classed('transparent', true);
                    d3.select('#b_export_data_all').classed('transparent', true);
                } else {
                    d3.select(this).classed('button_active', true).style('margin-right', '4px').html('X');
                    d3.select('#b_export_data_selection').classed('transparent', false);
                    d3.select('#b_export_data_all').classed('transparent', false);
                }
            })

            d3.select('#a_export_data_all').on('click', function(){
                var data_export_tsv_header = Object.keys(data_total[0]).join('\t'), 
                    data_export_tsv_rows = data_total.map(function(el){return Object.values(el).join('\t')}).join('\n'),
                    data_export_tsv = data_export_tsv_header + '\n' + data_export_tsv_rows;

                const blob = new Blob([data_export_tsv], {type: 'text/tsv'})
                d3.select(this).attr('download', chr + "_" + pos + "_" + ref + "_" + alt + "_cp_"+ myDate + '.tsv')
                document.querySelector("#a_export_data_all").href = window.URL.createObjectURL(blob);
            })

            d3.select('#a_export_data_selection').on('click', function(){
                var data_export_tsv_header = Object.keys(data_selection[0]).join('\t'), 
                    data_export_tsv_rows = data_selection.map(function(el){return Object.values(el).join('\t')}).join('\n'),
                    data_export_tsv = data_export_tsv_header + '\n' + data_export_tsv_rows;

                const blob = new Blob([data_export_tsv], {type: 'text/tsv'})
                d3.select(this).attr('download', chr + "_" + pos + "_" + ref + "_" + alt + "_cp_"+ myDate + '.tsv')
                document.querySelector("#a_export_data_selection").href = window.URL.createObjectURL(blob);
            })

            d3.select('#b_reset').on('click', function(){
                data_selection = [];
                data_total = data_initial;
                new_manual = null;

                d3.select('#p_filter').selectAll('button').classed('button_activef', false)
                d3.select('#p_filter').selectAll('.button_secondary').classed('.button_secondary_active', false).classed('transparent', true)

                eraseTable();
                drawRows(data_selection);
                drawSums(data_total);
                drawCount(data_visible, 'graph');
                drawDots(data_total);

                d3.select('#t_sums').selectAll('rect').remove();
                t_sum.select('#t_sum_count').select('p').text('-');
                t_sum.select('#t_sum_ref').select('p').text('-');
                t_sum.select('#t_sum_alt').select('p').text('-');

                d3.select('#b_manual_change').classed('transparent', true);
                d3.select('#t_manual_add').classed('transparent', false);
                d3.select('#t_table').classed('transparent', true);
                // d3.select('#t_table').style('width', '85.4%').classed('transparent', true);
                d3.selectAll('.manual').classed('transparent', true);
                d3.selectAll('circle').classed('g_dots_selected', false);

                d3.selectAll('.g_dots_click').remove();
                d3.selectAll('.g_rect').remove();

                d3.select('#t_manual_add').classed('transparent', true);
                d3.select('#table').selectAll('.heading').classed('transparent', true);
                d3.select('#t_message').classed('transparent', false);
            })

            d3.select('#b_manual_add').on('click', function(){
                data_total = data_total.map(v => ({...v, manual: new_manual}));
                data_selection = data_selection.map(v => ({...v, manual: new_manual}));
                eraseTable();
                drawRows(data_selection);
                drawSums(data_selection);
                getDataVisible();
                drawCount(data_visible, 'graph');
                drawDots(data_visible);
                d3.selectAll('.manual').classed('transparent', false);
                d3.select('#t_manual_add').remove();
                d3.select('#t_table').style('width', '100%');
            })

            var new_manual = null;

            function addManualCall(a){
                d3.select(a)
                    .classed('t_manual', true)
                    .attr('data-selected', 'selected')
                    .append('select')
                        .on('change', function(e, d){
                            new_manual = parseInt(e.target.value, 10);

                            var i_active = data_selection.indexOf(d)
                            data_selection[i_active].manual = new_manual;

                            var i_total = data_total.map(e=>e.FINNGENID).indexOf(d.FINNGENID)
                            data_total[i_total].manual = new_manual
                            
                            d3.select('#t_sums').classed('transparent', true);
                            d3.select('#b_manual_change').classed('transparent', false).html('Change all the manual calls of the selection into ' + rename(new_manual))

                            getDataVisible();
                            drawDots(data_visible);
                            drawCount(data_visible, 'graph');
                            drawCount(data_selection, 'table');
                        })
                        .selectAll('option').data([null, 0, 1, 2, -1]).enter()
                            .append('option')
                            .attr('value', function(d) {return d})
                            .html(function(d) {return rename(d)})
            }

            d3.select('#b_manual_change').data(data_total).on('click', function(){
                data_selection = data_selection.map(v => ({...v, manual: new_manual}));

                data_selection.map(e=>e.FINNGENID).forEach(function(d){
                    var i_total = data_total.map(e=>e.FINNGENID).indexOf(d);
                    data_total[i_total].manual = new_manual;
                });

                eraseTable();
                drawRows(data_selection);
                drawSums(data_selection);
                getDataVisible();
                drawCount(data_visible, 'graph');
                drawDots(data_visible);
                d3.selectAll('.manual').classed('transparent', false);
                d3.select(this).classed('transparent', true);
                d3.select('#t_sums').classed('transparent', false);
            })

            d3.select('#t_instruction_cta').select('u').on('click', function(){
                d3.select(this.parentNode).classed('transparent', true);
                d3.select('#t_instruction_list').classed('transparent', false);
                d3.select('#t_instruction_hide').classed('transparent', false);
            })

            d3.select('#t_instruction_hide').select('u').on('click', function(){
                d3.select(this.parentNode).classed('transparent', true);
                d3.select('#t_instruction_list').classed('transparent', true);
                d3.select('#t_instruction_cta').classed('transparent', false);
            })

            // Selection
            g_svg.on('click', function(e, d){
            if (d3.select('#b_selection_new').classed('button_active')){
                arrayOfClickedSpots.push([e.clientX - 5, e.clientY - 148]);
                g_svg.select('.g_selection_path').attr('d',`M${arrayOfClickedSpots.join('L')}Z`)
                g_svg.select('.g_selection_dots').append('circle').attr('cx', e.clientX - 5).attr('cy', e.clientY - 148).attr('r', 2).attr('fill', '#000');
                d3.selectAll('circle').classed('g_dots_selected', function(d, i){
                    if (d && d3.polygonContains(arrayOfClickedSpots, [cx(d.intensity_ref), cy(d.intensity_alt)])) {return true};
                })
            }})

            function eraseSelection(){
                g_svg.select('.g_selection_path').remove();
                g_svg.select('.g_selection_dots').remove();
                d3.selectAll('circle').classed('g_dots_selected', false);
            }

            //PANEL
            // d3.select('#panel').style('width', svg_width + 793 + 'px')
            drawGroupFilterButtons()
            drawDensityButtons(data_total);

            //Color buttons
            d3.select('#p_color').selectAll('button').on("click",function(){
                d3.select('#p_color').selectAll('button').classed('button_active', false)
                d3.select(this).classed('button_active', true)
                drawCount(data_selection, 'table');
                drawCount(data_visible, 'graph');
                colorDots();
            })

            //Filter buttons
            function drawGroupFilterButtons(){
                var data_group_filters = [
                {
                    'id': 'batch',
                    'name': 'Batch',
                    'buttons': dataBatch_Keys,
                },
                {
                    'id': 'sex',
                    'name': 'Sex',
                    'buttons': dataSex_Keys,
                },
                {
                    'id': 'raw',
                    'name': 'Raw',
                    'buttons': dataRaw_Keys,
                },
                {
                    'id': 'imputed',
                    'name': 'Imputed',
                    'buttons': dataImputed_Keys,
                },
                {
                    'id': 'exome',
                    'name': 'Exome',
                    'buttons': dataExome_Keys,
                },
                {
                    'id': 'manual',
                    'name': 'Manual',
                    'buttons': dataManual_Keys,
                },
            ]

                d3.select('#p_filter_buttons').remove();
                d3.select('#p_filter').append('div').attr('id', 'p_filter_buttons').selectAll('button')
                    .data(data_group_filters)
                    .enter()
                    .append('div').attr('id', function(d){return 'p_filter_' + d.id})
                    .append('button').classed('v3c-button', true)
                    .text(function(d){return d.name})
                    .on('click', function(e, d){
                        if (d3.select(this).classed('button_active')) {
                            d3.select(this).classed('button_active', false);
                            d3.select(this.parentNode).selectAll('.button_secondary').remove();
                            getDataVisible();
                            drawCount(data_visible, 'graph');
                            drawDots(data_visible);
                        } else {
                            d3.select(this).classed('button_active', true);
                            getDataVisible();
                            drawCount(data_visible, 'graph');
                            drawFilters(d.id, d.buttons);
                        }
                });

                d3.select('#p_filter_manual').classed('manual transparent', true);

                function drawFilters(a, b) {
                    d3.select('#p_filter_' + a).append('div').attr('class', 'button_container')
                        .selectAll('button')
                        .data(b)
                        .enter()
                        .append('button')
                        .attr('class', 'button_secondary v3c-button')
                        .text(function (d){
                            if (a === 'batch') return renameBatch(d)
                            else return rename(d)}
                        )
                        .on('click', function(e,d){
                            if (d3.select(this).classed('button_secondary_active')) {
                                d3.select(this).classed('button_secondary_active', false);
                                if      (a === 'batch')    visibility.batch      = visibility.batch.filter(el => el !== d)
                                else if (a === 'sex')      visibility.sex        = visibility.sex.filter(el => el !== d)
                                else if (a === 'raw')      visibility.raw        = visibility.raw.filter(el => el !== d)
                                else if (a === 'imputed')  visibility.imputed    = visibility.imputed.filter(el => el !== d)
                                else if (a === 'exome')    visibility.exome      = visibility.exome.filter(el => el !== d)
                                else if (a === 'manual')   visibility.manual     = visibility.manual.filter(el => el !== d)
                                
                            } else {
                                d3.select(this).classed('button_secondary_active', true);
                                if      (a === 'batch')    visibility.batch.push(d)
                                else if (a === 'sex')      visibility.sex.push(d)
                                else if (a === 'raw')      visibility.raw.push(d)
                                else if (a === 'imputed')  visibility.imputed.push(d)
                                else if (a === 'exome')    visibility.exome.push(d)
                                else if (a === 'manual')   visibility.manual.push(d)
                            }
                            getDataVisible()
                            drawCount(data_visible, 'graph')
                            drawDots(data_visible)
                    })
                }
            }

            function getDataVisible(){
                data_visible = []
                data_total.forEach(el => {if ((visibility.raw.includes(el.raw) || !d3.select('#p_filter_raw').select('button').classed('button_active')) && (visibility.imputed.includes(el.imputed) || !d3.select('#p_filter_imputed').select('button').classed('button_active')) && (visibility.sex.includes(el.sex) || !d3.select('#p_filter_sex').select('button').classed('button_active')) && (visibility.exome.includes(el.exome) || !d3.select('#p_filter_exome').select('button').classed('button_active')) && (visibility.batch.includes(el.batch) || !d3.select('#p_filter_batch').select('button').classed('button_active')) && (visibility.manual.includes(el.manual) || !d3.select('#p_filter_manual').select('button').classed('button_active'))) data_visible.push(el)})
            }

            // Density buttons
            function drawDensityButtons(g){
                var dataFiltered_Sex_Male = g.filter(el => el.sex === 'male'),
                    dataFiltered_Sex_Female = g.filter(el => el.sex === 'female');

                var dataFiltered_Raw_RefRef = g.filter(el => el.raw === 0),
                    dataFiltered_Raw_AltRef = g.filter(el => el.raw === 1),
                    dataFiltered_Raw_AltAlt = g.filter(el => el.raw === 2);

                var dataFiltered_Imputed_RefRef = g.filter(el => el.imputed === 0),
                    dataFiltered_Imputed_AltRef = g.filter(el => el.imputed === 1),
                    dataFiltered_Imputed_AltAlt = g.filter(el => el.imputed === 2);

                var data_isolines = [
                    {
                        'id':       'g_raw_refref',
                        'name':     'Raw ' + ref + ref,
                        'dataset':  dataFiltered_Raw_RefRef,
                        'color':    color03,
                    },
                    {
                        'id':       'g_raw_altref',
                        'name':     'Raw ' + ref + alt,
                        'dataset':  dataFiltered_Raw_AltRef,
                        'color':    color02,
                    },
                    {
                        'id':       'g_raw_altalt',
                        'name':     'Raw ' + alt + alt,
                        'dataset':  dataFiltered_Raw_AltAlt,
                        'color':    color01,
                    },
                    {
                        'id':       'g_imputed_refref',
                        'name':     'Imputed ' + ref + ref,
                        'dataset':  dataFiltered_Imputed_RefRef,
                        'color':    color03,
                    },
                    {
                        'id':       'g_imputed_altref',
                        'name':     'Imputed ' + ref + alt ,
                        'dataset':  dataFiltered_Imputed_AltRef,
                        'color':    color02,
                    },
                    {
                        'id':       'g_imputed_altalt',
                        'name':     'Imputed ' + alt + alt,
                        'dataset':  dataFiltered_Imputed_AltAlt,
                        'color':    color01,
                    },
                    {
                        'id':       'g_sex_male',
                        'name':     'Male',
                        'dataset':  dataFiltered_Sex_Male,
                        'color':    color06,
                    },
                    {
                        'id':       'g_sex_female',
                        'name':     'Female',
                        'dataset':  dataFiltered_Sex_Female,
                        'color':    color05,
                    }
                ]

                d3.select('#b_overlay_density').selectAll('button')
                    .data(data_isolines)
                    .enter()
                    .append('button')
                        .attr('class', 'button_secondary v3c-button')
                        .text(function(d){return d.name})
                        .on('click', function(e, d){
                            if (d3.select(this).classed('button_secondary_active')) {
                                d3.select('#' + d.id).remove();
                                d3.select(this).classed('button_secondary_active', false);
                            } else {
                                drawIsoline(d.dataset, d.color, d.id);
                                d3.select(this).classed('button_secondary_active', true);
                            }
                        })

                function drawIsoline(a, b, c){  
                    g_svg.select('#g_isolines').append('g')
                        .attr('id', c)
                        .selectAll("path")
                            .data(getDataContours(a))
                            .join("path")
                            .attr('class', 'g_isoline')
                            .attr('fill', 'none')
                            .attr('stroke', b)
                            .attr("stroke-width", (d, i) => i % 5 ? 0.25 : 1)
                            .attr("d", d3.geoPath())

                    function getDataContours(a){
                        return d3.contourDensity().x(d => cx(d.intensity_ref)).y(d => cy(d.intensity_alt))
                        .size([svg_width, svg_height]).bandwidth(30).thresholds(30)
                        (a)
                    }
                }
            }

            d3.select('#p_overlay_exome').on('click', function(){
                if (d3.select(this).classed('button_active')) {
                        d3.select(this).classed('button_active', false);
                        d3.select('#g_exomelocations').classed('transparent', true);
                    } else {
                        d3.select(this).classed('button_active', true);
                        d3.select('#g_exomelocations').classed('transparent', false);
                    }
            })

            d3.select('#p_overlay_density').on('click', function(){
                if (d3.select(this).classed('button_active')) {
                        d3.select(this).classed('button_active', false);
                        d3.select('#b_overlay_density').classed('transparent', true);
                        d3.select('#g_isolines').classed('transparent', true);
                    } else {
                        d3.select(this).classed('button_active', true);
                        d3.select('#b_overlay_density').classed('transparent', false);
                        d3.select('#g_isolines').classed('transparent', false);
                    }
            })

        //RESPONSIVE
        window.addEventListener('resize', function(){
            console.log('ciao')
            svg_height = window.innerHeight - 285
            svg_width = document.getElementsByTagName('#v3c-body')[0].clientWidth - 820            
            
            u = svg_height/12
            x_axis = svg_width - u - m
            y_axis = svg_height - u - m

            cx = d3.scaleLog().domain(zoom_extent_x).range([u, x_axis + u]);
            cy = d3.scaleLog().domain(zoom_extent_y).range([y_axis, m]);

            var arrayOfClickedSpots = [];

            d3.select('#panel').style('width', svg_width + 793 + 'px');
            d3.select('#table').style('height', svg_height + 111 + 'px');
            d3.select('#g_axis').remove();
            drawAxes();
            d3.select('#t_rows').style('height', svg_height - 102 + 'px')
            d3.select('#t_manual_add').style('height', svg_height + 42 + 'px')
            d3.select('#b_overlay_density').selectAll('button').attr('class', 'button_secondary');
            d3.select('#g_isolines').selectAll('g').remove();
            drawDots(data_visible);
            drawExomeLocations()
        }, true)

    }

    }, [data])

    return (
    <div id="v3c-body">
    
    <div id="header">
        <div id="h_description">
            <p></p>
        </div>
    </div>

    <div id="flex-div" style={{display: "flex", flexDirection: "row", justifyContent: "left"}}>

    <div id="graph" className="transparent">
        <div className="heading button">
            <button id='b_selection_new'    className='button_fixed-width v3c-button'>New selection</button>
            <button id='b_selection_add'    className='transparent v3c-button'>Add dots</button>
            <button id='b_selection_filtered' className="v3c-button">Select filtered</button>
            <a id="a_export_chart_svg"><button id='b_export_chart_svg' style={{float: 'right', marginRight:'0'}} className='button_secondary transparent v3c-button'>SVG</button></a>
            <a id="a_export_chart_jpg"><button id='b_export_chart_jpg' style={{float: 'right'}}                  className='button_secondary transparent v3c-button'>JPG</button></a>
            <button id='b_export_chart'     style={{float: 'right', marginRight:'0'}} className="v3c-button">Export chart</button>
            <button id='b_selection_undo'   className="transparent v3c-button" style={{float: 'right'}} >Undo selection</button>
        </div>
        <div className="heading count">
            <p id="g_alert" className="transparent">Draw a polygon selection on the chart area.</p>
        </div>
        <div className="g_zoom_buttons">
            <button id='b_zoom_reset'   className="transparent v3c-button"         style={{float: 'right'}}>Reset zoom</button>
            <button id='b_zoom_less'    className="b_zoom_controllers v3c-button"  style={{float: 'right', width: '30px'}} >-</button>
            <button id='b_zoom_more'    className="b_zoom_controllers v3c-button"  style={{float: 'right', width: '30px'}}>+</button>
            <button id='b_zoom_k'       className="b_zoom_controllers v3c-button"  style={{float: 'right', width: '55px'}}>x1</button>
        </div>
        <svg>
            <g id="g_dots"></g>
            <g id="g_isolines"  className="transparent"></g>
            <g id="g_exomelocations" className="transparent"></g>
        </svg>
    </div>

    <div id="table" className="transparent">
        <div className="heading button transparent">
            <a id='a_export_data_selection' download><button id='b_export_data_selection' style={{float: 'right', marginRight:'0'}}    type="submit" className='button_secondary transparent v3c-button'>Selection</button></a>
            <a id='a_export_data_all'       download><button id='b_export_data_all'       style={{float: 'right'}}                     type="submit" className='button_secondary transparent v3c-button'>All</button></a>
            <button id='b_export_data' style={{float: 'right', marginRight:'0'}} className="v3c-button">Export data</button>
        </div>
        <div className="heading count transparent" style={{marginBottom:'0'}}></div>
        <div id='t_table' className="transparent">
            <div id='t_firstrow'>
                <div className='t_first t_cell_l'>FinnGen ID</div>
                <div className='t_first t_cell_s'>Batch</div>
                <div className='t_first t_cell_m'>Sex</div>
                <div className='t_first t_cell_xl' id='t_first_ref'>R intensity</div>
                <div className='t_first t_cell_xl' id='t_first_alt'>A intensity</div>
                <div className='t_first t_cell_m'>Raw</div>
                <div className='t_first t_cell_m'>Imputed</div>
                <div className='t_first t_cell_m'>Exome</div>
                <div className='t_first t_cell_m manual transparent'>Manual</div>
            </div>
            <div id='t_rows'></div>
            <div id='t_manual_change'>
                <button id='b_manual_change' className='button_active transparent v3c-button'>Change selection manual calls into XX</button>
            </div>
            <div id='t_sums'>
                <div id='t_sum_count'   className='t_row t_cell_l'>Count<p className='t_sum_value'>-</p></div>
                <div className='t_row t_cell_s'></div>
                <div id='t_sum_sex'     className='t_row t_cell_m'>Ratio<svg className='t_sum_graph'></svg></div>
                <div id='t_sum_ref'     className='t_row t_cell_xl'>Mean<p className='t_sum_value'>-</p></div>
                <div id='t_sum_alt'     className='t_row t_cell_xl'>Mean<p className='t_sum_value'>-</p></div>
                <div id='t_sum_raw'     className='t_row t_cell_m'>Ratio<svg className='t_sum_graph'></svg></div>
                <div id='t_sum_imputed' className='t_row t_cell_m'>Ratio<svg className='t_sum_graph'></svg></div>
                <div id='t_sum_exome'   className='t_row t_cell_m'>Ratio<svg className='t_sum_graph'></svg></div>
            </div>
        </div>
        <div id='t_manual_add' className='transparent'>
            <button id='b_manual_add' style={{float: 'right', marginRight:'3px'}} className="v3c-button">Add manual</button>
        </div>
        <div id='t_message'>
            <p>Select the dots to display information.</p>
            <h4 id='t_instruction_cta'>First time? <u>Read instructions</u>.</h4>
            <ol id='t_instruction_list' className='transparent'>
                <li>EXPLORE the dataset by changing the coloring and the filtering of the dots in the bottom panel.<br/>Density isolines may be useful since dots overlap.<br/>Note data is sampled: from each batch, up to only 100 individuals of each genotype are included</li>
                <li>SELECT the interesting dots in the chart with<br/>the 'New selection' button on the top left corner.</li>
                <li>CORRECT their raw and imputed calls with the 'Add manual call' button on the right-side panel.</li>
                <li>EXPORT the dataset with the new 'Manual call' parameter using the 'Export data' button on the top right corner.</li>
            </ol>
            <h4 id='t_instruction_hide' className='transparent'><u>Hide instructions.</u></h4>
        </div>
    </div>

    </div>

    <div id="panel" className="transparent">
        <div className='panel' id='p_color'>
            <div className="p_inner">Color dots</div>
            <button id='p_color_sex'     className='p_color_all v3c-button'>Sex</button>
            <button id='p_color_raw'     className='p_color_all button_active v3c-button'>Raw</button>
            <button id='p_color_imputed' className='p_color_all v3c-button'>Imputed</button>
            <button id='p_color_exome'   className='p_color_all v3c-button'>Exome</button>
            <button id='p_color_manual'  className='p_color_all manual transparent v3c-button'>Manual</button>
        </div>
        <div className="panel" id="p_filter" style={{margin:'0'}}>
            <div className="p_inner">Filter dots</div>
            <div id="p_filter_buttons">
                <button id='b_filter_reset' className="button_secondary v3c-button" style={{float: 'right'}}>Reset filters</button>
            </div>
        </div>
        <div className="panel" id="p_overlay" style={{borderWidth: '1px 1px 1px 0', margin:'0'}}>
            <div className="p_inner">Overlay</div>
            <button id='p_overlay_exomen' className="v3c-button">Exome locations</button>
            <button id='p_overlay_density' className="v3c-button">Density isolines</button>
            <div id='b_overlay_density' className="transparent"></div>
        </div>
    </div>


    </div>
    )
}
