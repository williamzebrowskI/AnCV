export function createNeuronPopup(svg) {
    const popup = svg.append("g")
        .attr("class", "neuron-popup")
        .style("display", "none")
        .style("pointer-events", "all");

    // Background for the popup with a sleek, modern look
    popup.append("rect")
        .attr("width", 220)
        .attr("height", 230)
        .attr("fill", "#000000")  // Solid black background
        .attr("stroke", "rgba(255, 255, 255, 0.2)")  // Subtle glow effect
        .attr("stroke-width", 2)
        .attr("rx", 10)
        .attr("ry", 10)
        .style("filter", "drop-shadow(0 4px 10px rgba(255, 255, 255, 0.3))");  // Soft shadow effect

    // Title text for node info - clean, modern font
    popup.append("text")
        .attr("class", "popup-title")
        .attr("x", 10)
        .attr("y", 25)
        .attr("fill", "#00BFFF")  // Light Blue for the title
        .style("font-family", "'Helvetica Neue', Helvetica, Arial, sans-serif")  // Modern font
        .style("font-weight", "bold")
        .style("font-size", "16px");

    popup.append("text")
        .attr("class", "popup-weight")
        .attr("x", 10)
        .attr("y", 60)
        .attr("fill", "#FFD700")  // Soft Yellow for the weight
        .style("font-family", "'Helvetica Neue', Helvetica, Arial, sans-serif")
        .style("font-size", "13px");

    popup.append("text")
        .attr("class", "popup-bias")
        .attr("x", 10)
        .attr("y", 90)
        .attr("fill", "#FFD700")  // Soft Yellow for the bias
        .style("font-family", "'Helvetica Neue', Helvetica, Arial, sans-serif")
        .style("font-size", "13px");

    popup.append("text")
        .attr("class", "popup-pre-activation")
        .attr("x", 10)
        .attr("y", 120)
        .attr("fill", "#FFD700")  // Soft Yellow for the pre-activation
        .style("font-family", "'Helvetica Neue', Helvetica, Arial, sans-serif")
        .style("font-size", "13px");

    popup.append("text")
        .attr("class", "popup-activation")
        .attr("x", 10)
        .attr("y", 150)
        .attr("fill", "#FFA500")  // Light Orange for the post-activation
        .style("font-family", "'Helvetica Neue', Helvetica, Arial, sans-serif")
        .style("font-size", "13px");

    popup.append("text")
        .attr("class", "popup-gradient")
        .attr("x", 10)
        .attr("y", 180)
        .attr("fill", "#FFA500")  // Light Orange for the gradient
        .style("font-family", "'Helvetica Neue', Helvetica, Arial, sans-serif")
        .style("font-size", "13px");

    // Sparkline similar to loss chart's line chart
    const sparkline = popup.append("path")
        .attr("class", "sparkline")
        .attr("fill", "none")
        .attr("stroke", "#32CD32")  // Light Green for the sparkline
        .attr("stroke-width", 2);

    return d3.select(popup.node());
}

export function updateNeuronPopup(popup, x, y, data) {
    const xOffset = -60;  // Adjusted offsets for better positioning
    const yOffset = -50;

    popup.attr("transform", `translate(${x + xOffset},${y + yOffset})`)
        .style("display", "block");

    popup.select(".popup-title")
        .text(`${data.layerType} Node ${data.nodeIndex}`);

    popup.select(".popup-weight")
        .text(`Weight: ${typeof data.weight === 'number' ? data.weight.toFixed(4) : data.weight}`);

    popup.select(".popup-bias")
        .text(`Bias: ${typeof data.bias === 'number' ? data.bias.toFixed(4) : data.bias}`);

    popup.select(".popup-pre-activation")
        .text(`Weighted Sum: ${typeof data.preActivation === 'number' ? data.preActivation.toFixed(4) : data.preActivation}`);

    popup.select(".popup-activation")
        .text(`Activation: ${typeof data.activation === 'number' ? data.activation.toFixed(4) : data.activation}`);

    popup.select(".popup-gradient")
        .text(`Gradient: ${typeof data.gradient === 'number' ? data.gradient.toFixed(4) : data.gradient}`);

    // Sparkline similar to loss chart's line chart
    if (data.backpropHistory && data.backpropHistory.length > 0) {
        const lineGenerator = d3.line()
            .x((d, i) => i * 20)
            .y(d => d * -20);  // Flip the Y-axis to mimic graph direction

        popup.select(".sparkline")
            .attr("d", lineGenerator(data.backpropHistory))
            .attr("transform", "translate(10, 200)");
    } else {
        popup.select(".sparkline").attr("d", ""); // Clear sparkline if no data
    }
}

export function hideNeuronPopup(popup) {
    popup.style("display", "none");
}