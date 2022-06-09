import React, { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import * as d3 from 'd3'
import * as turf from '@turf/turf'


export const VariantPlotMap = () => {

    const data = useSelector(state => state.data.data)
    const options = useSelector(state => state.data.options)
    const use_data = data.agg.regions
    var geo_data = data.geo_data['features']
    var hethom_title = options.maphethom == 'het' ? 'heterozygous' : 'homozygous'
    var title =  options.cntfreq == 'freq' ? "Allele frequency by region of birth" :  "Number of " + hethom_title + " genotypes by region of birth"

    const width = 800;
	const height = 550;
	const colors = ["#F5F9FF", "#BBD1EB", "#599DCC", "#1C5BA6", "#0A2258"]
	var regions = ["Region_ceded_to_Soviet", "NA", "Abroad"]
	var text = options.cntfreq == 'freq' ? "AF" : "GT count" 
	var leg_title = options.cntfreq == 'freq' ? "Allele frequency" : "Genotype count" 

    var svg_data=[]
    var values = []
    for (var i=0; i<geo_data.length; i++){
    	var feature = geo_data[i]
    	var geom = turf.rewind(feature['geometry'], {reverse:true})
    	// match geo data and finngen data
    	var id = use_data.names.findIndex(obj => { return obj == feature['properties']['shapeName_gb'] })
    	var fg_stats = {}
    	if (id !== -1){
    		var element = options.cntfreq == 'freq' ? use_data.af[id] : options.maphethom == 'het' ? use_data.gt_counts[0][id] : use_data.gt_counts[1][id]
    		fg_stats = {
    			'value': element
    		}
    		values.push(element)
    	} else {
    		fg_stats = {
    			'value': NaN
    		}
    	}
    	const prop = Object.assign({}, fg_stats, feature['properties'])
    	svg_data.push({'type': feature['type'], 
    				   'properties': prop, 
    				   'geometry': geom})
	}

	var projection = d3.geoMercator()
		.center([23, 61])
		.scale(1200)
		.translate([width/2-50, 490]); 
	const path = d3.geoPath().projection(projection);

	// choose min and max value for the plot
	var min_val = Math.min.apply(Math, values)
	// var min_val = 0
	var max_val = Math.max.apply(Math, values)
	if (options.cntfreq == 'freq'){
		const af_thres = [0.001, 0.005, 0.01, 0.05]
		for (i=0; i<af_thres.length; i++){
			if (max_val < af_thres[i]){
				max_val = af_thres[i]
				min_val = 0
				break
			}
		}
	} else {
		// for GT count: fix min count to 0
		min_val = 0
		max_val = min_val == 0 && max_val == 0 ? 1 : max_val
	} 

	// bin data for the legend
	var len = colors.length
	var step = (max_val - min_val) / (len - 1)
	var val_seq = [min_val]
	for (var i=1; i<len; i++){
		val_seq.push(val_seq[i - 1] + step)
	}

	var tooltip = d3.select("body").append("div")
		.style("background-color", "white")
		.style("border", "solid")
		.style("border-width", "1px")
		.style("border-radius", "5px")
		.style("padding", "10px")
		.style("opacity", 0);

	var colorScaleLinear = d3.scaleLinear()
			.domain(val_seq)
			.range(colors) 

	const ref = useRef()
	useEffect(()=> {
		const svg = d3.select(ref.current)
			.style("width", width)
			.style("height", height)

		// remove previous content
		svg.selectAll("*").remove()

		svg.append("svg")
			.selectAll('path')
			.data(svg_data)
		    .enter()
		    .append('path')
		    .attr("d", path)
		    .style("fill", function(d) {
		    	return colorScaleLinear(d.properties.value)
		    })
		    .style("stroke", "#000000")
		    .style("stroke-width", 0.5)
		    .on("mouseover",function(e, d) {
		   		tooltip.html(
		   				"<b>Region: </b>" + d.properties.shapeName_gb + "<br />" +
		   				"<b>" + text + ": </b>"+ `${ options.cntfreq == 'freq' ? parseFloat(d.properties.value).toFixed(6) : d.properties.value}`
		   			)
		        	.style("left", (event.clientX + 4) + "px")
		        	.style("top", (event.clientY - 4) + "px")
		        	.style("position", "fixed")
		        .transition()
		        	.duration(200)
		        	.style("opacity", 1);
		        d3.select(this)
		        .style("stroke", "#000000")
		        .style("stroke-width", 2)
		        .classed("active",true)
		    })
		    .on("mouseout",function(d){
		    	d3.select(this)
		        	.style("stroke", "#000000")
		        	.style("stroke-width", 0.5)
		        	.classed("active",false)
		    	tooltip.transition()
	    	    	.duration(300)
    	    		.style("opacity", 0);
		    });

		var defs = svg.append('defs')
		var linearGradient = defs.append('linearGradient')
			.attr('id', 'linear-gradient')

		linearGradient
			.attr("x1", "0%")
			.attr("y1", "0%")
			.attr("x2", "0%")
			.attr("y2", "100%")

		linearGradient.selectAll("stop")
			.data([
				{offset: "0%", color: colors[0]},
				{offset: "20%", color: colors[1]},
				{offset: "50%", color: colors[2]},
				{offset: "75%", color: colors[3]},
				{offset: "100%", color: colors[4]}
			])
			.enter()
			.append("stop")
			.attr("offset", function(d){return d.offset})
			.attr("stop-color", function(d){return d.color})

		svg.append("text")
			.attr("x", 20)
			.attr("y", 20)
			.style("text-anchor", "left")
			.text(leg_title)

		svg.append("rect")
			.attr("x", 75)
			.attr("y", 40)
			.attr("width", 15)
			.attr("height", 250)
			.style("fill", "url(#linear-gradient)")

		var scaleLegend = d3.scaleLinear()
			.domain([min_val, max_val])
			.range([0, 249])
		
		var axisLegend = d3.axisLeft(scaleLegend)
			.tickValues(colorScaleLinear.domain())

		svg.attr("class", "axis")
			.append("g")
			.attr("transform", "translate(64, 40)")
			.call(axisLegend)
			.selectAll("text")
				.style("font-size", "14px")

	}, [svg_data])

    return (
    	<div style={{width: width, height: "600px", display: "inline-block", verticalAlign: "top"}}>
    		<p style={{width: width, textAlign: "center", marginTop: "10px", marginBottom: "10px"}}>{title}</p>
			<svg ref={ref}></svg>
		</div>
    )
}
