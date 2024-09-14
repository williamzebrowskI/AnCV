export function updateActivationMap(popup, activationHistory, nodeId, legendX = 140, legendY = -50, isTraining = false) {
    console.log(`Updating activation map for ${nodeId}`, activationHistory);

    const graphWidth = 250;
    const graphHeight = 120;
    const margin = { top: -40, right: 50, bottom: 60, left: 30 };
    const width = graphWidth - margin.left - margin.right;
    const height = graphHeight - margin.top - margin.bottom;

    // Sanitize the nodeId for use in class names
    const sanitizedNodeId = nodeId.replace(/\s+/g, '-');

    // Prepare data
    const data = activationHistory.map((entry, index) => ({
        index,
        activation: parseFloat(entry.activation)
    })).filter(d => !isNaN(d.activation));

    console.log(`Creating activation chart with ${data.length} data points`);

    const svg = popup.select(".activation-graph");
    svg.selectAll("*").remove();  // Clear previous content

    // Set the viewBox to ensure the SVG scales correctly
    svg.attr("viewBox", `0 0 ${graphWidth} ${graphHeight}`)
       .attr("width", "100%")
       .attr("height", "auto");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleLinear()
        .domain([0, Math.max(1, data.length - 1)])  // Ensure domain is always valid
        .range([0, width]);

    // Y scale
    const y = d3.scaleLinear()
        .domain([-1, 1])  // Typical range for activation functions
        .range([height, 0]);

    // Add X axis
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5))
        .call(g => g.select(".domain").attr("stroke", "rgba(255, 255, 255, 0.7)"))
        .call(g => g.selectAll("text").attr("fill", "rgba(255, 255, 255, 0.7)"));

    // Add Y axis
    g.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .call(g => g.select(".domain").attr("stroke", "rgba(255, 255, 255, 0.7)"))
        .call(g => g.selectAll("text").attr("fill", "rgba(255, 255, 255, 0.7)"));

    // Define color for activation
    const activationColor = "rgba(0, 255, 255, 1)";  // Cyan

    // Add the activation line if there's data
    if (data.length > 0) {
        const line = d3.line()
            .x(d => x(d.index))
            .y(d => y(d.activation))
            .curve(d3.curveMonotoneX);  // Smooth the line

        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", activationColor)
            .attr("stroke-width", 2)
            .attr("d", line);

        // Add circles at each data point
        g.selectAll(".data-point")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "data-point")
            .attr("cx", d => x(d.index))
            .attr("cy", d => y(d.activation))
            .attr("r", 3)
            .attr("fill", activationColor)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .on("mouseover", function(event, d) {
                // Show tooltip
                d3.select(this)
                    .attr("r", 5);

                g.append("text")
                    .attr("class", "tooltip")
                    .attr("x", x(d.index))
                    .attr("y", y(d.activation) - 10)
                    .attr("text-anchor", "middle")
                    .attr("fill", "white")
                    .attr("font-size", 10)
                    .text(d.activation.toFixed(3));
            })
            .on("mouseout", function(event, d) {
                // Remove tooltip
                d3.select(this)
                    .attr("r", 3);

                g.selectAll(".tooltip").remove();
            });
    }

    // Add legend with adjustable position
    const legend = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "start")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    legend.append("rect")
        .attr("x", 0)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", activationColor);

    legend.append("text")
        .attr("x", 18)
        .attr("y", 9)
        .text("Activation")
        .attr("fill", "rgba(255, 255, 255, 0.9)");

    // Add X axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", graphWidth / 2)
        .attr("y", graphHeight - 5)
        .attr("font-size", 10)
        .attr("fill", "rgba(255, 255, 255, 0.7)")
        .text("Time Step");

    // Add Y axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", 15)
        .attr("x", -graphHeight / 2)
        .attr("font-size", 10)
        .attr("fill", "rgba(255, 255, 255, 0.7)")
        .text("Activation Value");

    // Add "No Data" or "Training..." text if there's no data
    if (data.length === 0) {
        g.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "rgba(255, 255, 255, 0.7)")
            .text(isTraining ? "Training..." : "No Data");
    }

    console.log(`Activation chart creation complete`);
}