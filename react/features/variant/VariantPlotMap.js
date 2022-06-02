import React, { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import * as d3 from 'd3'
import * as turf from '@turf/turf'


export const VariantPlotMap = () => {

    const data = useSelector(state => state.data.data)
    const options = useSelector(state => state.data.options)
    const use_data = data.agg.regions
    var geo_data = data.geo_data['features']
    const width = 800;
	const height = 550;
	const colors = ["#F5F9FF", "#BBD1EB", "#599DCC", "#1C5BA6", "#0A2258"]

    var svg_data=[]
    for (var i=0; i<geo_data.length; i++){
    	var feature = geo_data[i]
    	var geom = turf.rewind(feature['geometry'], {reverse:true})
    	// match geo data and finngen data
    	var id = use_data.names.findIndex(obj => { return obj == feature['properties']['shapeName_gb'] })
    	var fg_stats = {}
    	if (id !== -1){
    		fg_stats = {
    			'af': use_data.af[id], 
    			'gt_counts': [use_data.gt_counts[0][id], use_data.gt_counts[1][id]],
    			'num_indiv': use_data.num_indiv[id]
    		}
    	} else {
    		fg_stats = {
    			'af': NaN, 
    			'gt_counts': NaN,
    			'num_indiv': NaN
    		}
    	}
    	const prop = Object.assign({}, fg_stats, feature['properties'])
    	svg_data.push({'type': feature['type'], 
    				   'properties': prop, 
    				   'geometry': geom})
	}

	// exclude NA, Abroad and Soviet areas
	var regions = ["Region_ceded_to_Soviet", "NA", "Abroad"]
	var af = use_data.af
	for (var i=0; i<regions.length; i++){ 
		var ind = use_data.names.findIndex(obj => { return obj == regions[i] })
		af = af.filter(function(element, i) {if (i != ind){
			return element
		} })
	}

	var projection = d3.geoMercator()
		.center([23, 61])
		.scale(1200)
		.translate([width/2-50, 490]); 
	const path = d3.geoPath().projection(projection);

	var tooltip = d3.select("body").append("div")
		.style("background-color", "white")
		.style("border", "solid")
		.style("border-width", "1px")
		.style("border-radius", "5px")
		.style("padding", "10px")
		.style("opacity", 0);

	const min_af = Math.min.apply(Math, af)
	const max_af = Math.max.apply(Math, af)

	// bin af data for the legend
	var len = colors.length
	var step = (max_af - min_af) / (len - 1)
	var af_seq = [min_af]
	for (var i=1; i<len; i++){
		af_seq.push(af_seq[i - 1] + step)
	}

	var colorScaleLinear = d3.scaleLinear()
			.domain(af_seq)
			.range(colors) 

	const ref = useRef()
	useEffect(()=> {
		const svg = d3.select(ref.current)
			.style("width", width)
			.style("height", height)

		svg.append("svg")
			.selectAll('path')
			.data(svg_data)
		    .enter()
		    .append('path')
		    .attr("d", path)
		    .style("fill", function(d) {
		    	return colorScaleLinear(d.properties.af)
		    })
		    .style("stroke", "#000000")
		    .style("stroke-width", 0.5)
		    .on("mouseover",function(e, d) {
		   		console.log("just had a mouseover", d.properties.shapeName_gb);
		   		tooltip.html(
		   				"<b>Region: </b>" + d.properties.shapeName_gb + "<br />" +
		   				"<b>AF: </b>"+ parseFloat(d.properties.af).toFixed(6)
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
			.text("Allele frequency")

		svg.append("rect")
			.attr("x", 75)
			.attr("y", 40)
			.attr("width", 15)
			.attr("height", 250)
			.style("fill", "url(#linear-gradient)")

		var scaleLegend = d3.scaleLinear()
			.domain([min_af, max_af])
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
    		<p style={{width: width, textAlign: "center", marginTop: "10px", marginBottom: "10px"}}>Allele frequency by region of birth</p>
			<svg ref={ref}></svg>
		</div>
    )
}
