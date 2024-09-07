export function createNeuronPopup(svg) {
    const popup = svg.append("g")
        .attr("class", "neuron-popup")
        .style("display", "none");

    popup.append("rect")
        .attr("width", 200)
        .attr("height", 200)  // Increased height to accommodate all fields
        .attr("fill", "rgba(52, 152, 219, 0.9)")
        .attr("rx", 10)
        .attr("ry", 10);

    popup.append("text")
        .attr("class", "popup-title")
        .attr("x", 10)
        .attr("y", 20)
        .attr("fill", "white")
        .style("font-weight", "bold");

    popup.append("text")
        .attr("class", "popup-weight")
        .attr("x", 10)
        .attr("y", 50)
        .attr("fill", "white");

    popup.append("text")
        .attr("class", "popup-bias")
        .attr("x", 10)
        .attr("y", 80)
        .attr("fill", "white");

    // Append Pre-Activation
    popup.append("text")
        .attr("class", "popup-pre-activation")
        .attr("x", 10)
        .attr("y", 110)  // Adjusted position for pre-activation
        .attr("fill", "white");

    popup.append("text")
        .attr("class", "popup-activation")
        .attr("x", 10)
        .attr("y", 140)
        .attr("fill", "white");

    popup.append("text")
        .attr("class", "popup-gradient")
        .attr("x", 10)
        .attr("y", 170)
        .attr("fill", "white");

    // Sparkline for backpropagation visualization
    const sparkline = popup.append("path")
        .attr("class", "sparkline")
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    return d3.select(popup.node());
}

export function updateNeuronPopup(popup, x, y, data) {
    const xOffset = -100;
    const yOffset = -180;

    popup.attr("transform", `translate(${x + xOffset},${y + yOffset})`)
        .style("display", "block");

    popup.select(".popup-title")
        .text(`${data.layerType} Node ${data.nodeIndex}`);

    popup.select(".popup-weight")
        .text(`Weight: ${typeof data.weight === 'number' ? data.weight.toFixed(4) : data.weight}`);

    popup.select(".popup-bias")
        .text(`Bias: ${typeof data.bias === 'number' ? data.bias.toFixed(4) : data.bias}`);

    // Update Pre-Activation
    popup.select(".popup-pre-activation")
        .text(`Pre-Activation: ${typeof data.preActivation === 'number' ? data.preActivation.toFixed(4) : data.preActivation}`);

    // Update Post-Activation
    popup.select(".popup-activation")
        .text(`Post-Activation: ${typeof data.activation === 'number' ? data.activation.toFixed(4) : data.activation}`);

    popup.select(".popup-gradient")
        .text(`Gradient: ${typeof data.gradient === 'number' ? data.gradient.toFixed(4) : data.gradient}`);

    // Sparkline for backpropagation visualization
    if (data.backpropHistory && data.backpropHistory.length > 0) {
        const lineGenerator = d3.line()
            .x((d, i) => i * 20)
            .y(d => d * 30);

        popup.select(".sparkline")
            .attr("d", lineGenerator(data.backpropHistory))
            .attr("transform", "translate(10, 150)");
    } else {
        popup.select(".sparkline").attr("d", ""); // Clear sparkline if no data
    }
}

export function hideNeuronPopup(popup) {
    popup.style("display", "none");
}