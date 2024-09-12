export function updateActivationMap(popup, activationHistory, nodeId) {
    console.log(`Updating activation map for ${nodeId}`, activationHistory);

    const graphWidth = 210;
    const graphHeight = 80;
    const margin = { top: 5, right: 5, bottom: 20, left: 25 };
    const width = graphWidth - margin.left - margin.right;
    const height = graphHeight - margin.top - margin.bottom;

    // Sanitize the nodeId for use in class names
    const sanitizedNodeId = nodeId.replace(/\s+/g, '-');

    // Use the full activation history
    let activationData = activationHistory.filter(d => typeof d === 'number' && !isNaN(d));

    console.log(`Filtered activation data:`, activationData);

    // Keep only the last 50 data points
    const maxDataPoints = 50;
    if (activationData.length > maxDataPoints) {
        activationData = activationData.slice(-maxDataPoints);
    }

    // Only proceed if we have valid data points
    if (activationData.length > 0) {
        console.log(`Creating chart with ${activationData.length} data points`);

        const x = d3.scaleLinear()
            .domain([0, activationData.length - 1])
            .range([0, width]);

        // Set y domain to accommodate GeLU's range (including small negative values)
        const yDomain = [
            Math.min(-0.1, d3.min(activationData)),
            Math.max(1, d3.max(activationData))
        ];

        console.log(`Y domain:`, yDomain);

        const y = d3.scaleLinear()
            .domain(yDomain)
            .range([height, 0]);

        const line = d3.line()
            .x((d, i) => x(i))
            .y(d => y(d))
            .curve(d3.curveMonotoneX);

        const svg = popup.select(".activation-graph");

        // Clear previous content
        svg.selectAll("*").remove();

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(${margin.left},${height + margin.top})`)
            .call(d3.axisBottom(x).ticks(5))
            .call(g => g.select(".domain").attr("stroke", "rgba(0, 255, 255, 0.7)"))
            .call(g => g.selectAll("text").attr("fill", "rgba(0, 255, 255, 0.7)"));

        // Add Y axis
        svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`)
            .call(d3.axisLeft(y).ticks(5))
            .call(g => g.select(".domain").attr("stroke", "rgba(0, 255, 255, 0.7)"))
            .call(g => g.selectAll("text").attr("fill", "rgba(0, 255, 255, 0.7)"));

        // Add reference lines
        const referenceLines = [0, 0.5, 1];
        referenceLines.forEach(value => {
            svg.append("line")
                .attr("x1", margin.left)
                .attr("x2", width + margin.left)
                .attr("y1", y(value) + margin.top)
                .attr("y2", y(value) + margin.top)
                .attr("stroke", "rgba(255, 99, 132, 0.5)")
                .attr("stroke-dasharray", "4");

            svg.append("text")
                .attr("x", 0)
                .attr("y", y(value) + margin.top)
                .attr("fill", "rgba(255, 99, 132, 0.7)")
                .attr("font-size", "10px")
                .attr("text-anchor", "start")
                .attr("dominant-baseline", "middle")
                .text(value.toFixed(1));
        });

        // Add the line
        svg.append("path")
            .datum(activationData)
            .attr("class", `activation-line activation-line-${sanitizedNodeId}`)
            .attr("fill", "none")
            .attr("stroke", "rgba(0, 255, 255, 1)")
            .attr("stroke-width", 2)
            .attr("d", line)
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Add label for activation
        svg.append("text")
            .attr("x", width / 2 + margin.left)
            .attr("y", margin.top - 5)
            .attr("text-anchor", "middle")
            .attr("fill", "rgba(0, 255, 255, 0.7)")
            .attr("font-size", "10px")
            .text("Activation");

        console.log(`Chart creation complete`);
    } else {
        console.log(`No valid data points to display`);
        // If no valid data, clear the path
        popup.select(`.activation-line-${sanitizedNodeId}`).attr("d", null);
    }
}