import * as d3 from 'd3';

export function createActivationChart(popup, width, height) {
    const margin = { top: 10, right: 10, bottom: 20, left: 25 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const chartGroup = popup.append("g")
        .attr("class", "activation-chart")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, 19])
        .range([0, chartWidth]);

    const y = d3.scaleLinear()
        .domain([0, 1])
        .range([chartHeight, 0]);

    // Add the X Axis
    chartGroup.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => d * 5));

    // Add the Y Axis
    chartGroup.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).ticks(5));

    // Add the line path
    chartGroup.append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "rgba(0, 255, 255, 0.8)")
        .attr("stroke-width", 1.5);

    // Add chart title
    chartGroup.append("text")
        .attr("class", "chart-title")
        .attr("x", chartWidth / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "white")
        .text("Activation History");

    return { x, y, chartGroup, chartWidth, chartHeight };
}

export function updateActivationChart(chart, data) {
    const { x, y, chartGroup, chartWidth, chartHeight } = chart;

    const line = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d));

    chartGroup.select(".line")
        .datum(data)
        .attr("d", line);
}