let isOverNode = false;
let hidePopupTimeout;
let isOverPopup = false;

export function createNeuronPopup(svg) {
    const popup = svg.append("g")
        .attr("class", "neuron-popup")
        .style("display", "none")
        .style("pointer-events", "all");

    // Futuristic background with a gradient and glowing border
    popup.append("rect")
        .attr("width", 240)
        .attr("height", 250)
        .attr("fill", "url(#popupGradient)")  // Gradient fill
        .attr("stroke", "rgba(0, 255, 255, 1)")  // Neon glowing effect
        .attr("stroke-width", 2)
        .attr("rx", 15)
        .attr("ry", 15)
        .style("filter", "drop-shadow(0 0 15px rgba(0, 100, 255, 1))");

    // Define gradient for background
    svg.append("defs").append("linearGradient")
        .attr("id", "popupGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%")
        .append("stop").attr("offset", "0%").attr("stop-color", "#0f0f0f")
        .append("stop").attr("offset", "100%").attr("stop-color", "#2f2f2f");

    // Title text for node info with neon glow
    popup.append("text")
        .attr("class", "popup-title")
        .attr("x", 15)
        .attr("y", 30)
        .attr("fill", "rgba(255, 99, 132, 1)")
        .style("font-family", "'Orbitron', sans-serif")  // Futuristic font
        .style("font-weight", "bold")
        .style("font-size", "18px")
        .style("text-shadow", "0 0 8px rgba(255, 99, 132, 1)");

    // Data fields with animated glow effect
    const fields = ["weight", "bias", "pre-activation", "activation", "gradient"];
    fields.forEach((field, index) => {
        popup.append("text")
            .attr("class", `popup-${field}`)
            .attr("x", 15)
            .attr("y", 60 + index * 30)
            .attr("fill", "#ffffff")
            .style("font-family", "'Orbitron', sans-serif")
            .style("font-size", "14px")
            .style("text-shadow", "0 0 6px rgba(255, 99, 132, 1)")
            .style("animation", "glowAnimation 2s infinite");
    });

    // Sparkline with neon glow effect
    const sparkline = popup.append("path")
        .attr("class", "sparkline")
        .attr("fill", "none")
        .attr("stroke", "rgba(0, 255, 255, 1)")  // Neon pink color for the sparkline
        .attr("stroke-width", 2)
        .style("filter", "drop-shadow(0 0 8px rgba(0, 255, 255, 1))");

    // CSS animations for glowing effect
    svg.append("style").text(`
        @keyframes glowAnimation {
            0% { text-shadow: 0 0 8px rgba(255, 99, 132, 1); }
            50% { text-shadow: 0 0 12px rgba(255, 99, 132, 1); }
            100% { text-shadow: 0 0 8px rgba(255, 99, 132, 1); }
        }
    `);

    return d3.select(popup.node());
}

export function handleNeuronMouseover(popupGroup, popup, event, layerType, nodeIndex, nodeData) {
    isOverNode = true;
    clearTimeout(hidePopupTimeout);  // Cancel any pending hide popup action

    // Style the hovered node
    d3.select(event.target).style("stroke", "rgba(0, 255, 255, 1)").style("stroke-width", "4px");

    // Ensure mouse position values are valid (fallback to clientX/clientY if pageX/pageY is NaN)
    const x = isNaN(event.pageX) ? event.clientX : event.pageX;
    const y = isNaN(event.pageY) ? event.clientY : event.pageY;

    // Update the popup's content and position
    updateNeuronPopup(popup, x, y, {
        layerType: layerType,
        nodeIndex: nodeIndex,
        ...nodeData
    });

    // Raise the entire popup group to ensure it's on top of everything
    popupGroup.raise();

    // Make sure the popup is visible
    popup.style("display", "block");
}
export function handleNeuronMouseleave(popup, event) {
    // Indicates that the mouse has left the neuron
    isOverNode = false;

    // Restore the original style of the neuron
    d3.select(event.target).style("stroke", "white").style("stroke-width", "2px");

    // Set a timeout to hide the popup, giving the user time to hover over it if needed
    hidePopupTimeout = setTimeout(() => {
        if (!isOverPopup) {
            hideNeuronPopup(popup);
        }
    }, 100);
}

export function getNodeData(layerIndex, i, forwardData, data, layers) {
    const nodeData = {
        weight: 'N/A',
        bias: 'N/A',
        preActivation: 'N/A',
        activation: 'N/A',
        gradient: 'N/A',
        backpropHistory: []
    };

    // Input Layer: Get input value dynamically
    if (layerIndex === 0) {
        if (forwardData && forwardData.input && forwardData.input.length > 0) {
            const singleSample = data.epoch % forwardData.input.length;  // Cycle through samples dynamically
            nodeData.inputValue = forwardData.input[singleSample][i];  // Get the value for this neuron
        }
    }
    // Hidden Layers
    else if (layerIndex > 0 && layerIndex < layers.length - 1) {
        if (forwardData && forwardData.hidden_activation && forwardData.hidden_activation.length > layerIndex - 1) {
            nodeData.preActivation = forwardData.hidden_activation[layerIndex - 1].pre_activation || 'N/A';
            nodeData.activation = forwardData.hidden_activation[layerIndex - 1].post_activation || 'N/A';
        }
    }
    // Output Layer
    else if (layerIndex === layers.length - 1) {
        // Output layer logic can go here
    }

    return nodeData;
}

export function updateNeuronPopup(popup, x, y, data) {
    const xOffset = -60;
    const yOffset = -50;

    popup.attr("transform", `translate(${x + xOffset},${y + yOffset})`)
        .style("display", "block");

    popup.select(".popup-title")
        .text(`${data.layerType} Node ${data.nodeIndex}`);

    // Handle input layer specifically, showing input value
    if (data.layerType === "Input") {
        const inputValue = Array.isArray(data.inputValue) 
            ? data.inputValue.join(', ') 
            : (typeof data.inputValue === 'number' ? data.inputValue.toFixed(4) : 'N/A');
        popup.select(".popup-weight").text(`Input Value: ${inputValue}`);
        popup.select(".popup-bias").text("");  // Clear bias field for input layer since it's not relevant
    } else {
        // Handle weight and bias for hidden and output layers
        const weight = typeof data.weight === 'number' 
            ? data.weight.toFixed(4) 
            : Array.isArray(data.weight) 
            ? d3.mean(data.weight).toFixed(4) 
            : 'N/A';
        const bias = typeof data.bias === 'number' 
            ? data.bias.toFixed(4) 
            : Array.isArray(data.bias) 
            ? d3.mean(data.bias).toFixed(4) 
            : 'N/A';

        popup.select(".popup-weight").text(`Weight: ${weight}`);
        popup.select(".popup-bias").text(`Bias: ${bias}`);
    }

    // Pre-activation value
    const preActivation = typeof data.preActivation === 'number' 
        ? data.preActivation.toFixed(4) 
        : 'N/A';
    popup.select(".popup-pre-activation")
        .text(`Weighted Sum: ${preActivation}`);

    // Post-activation value
    const activation = typeof data.activation === 'number' 
        ? data.activation.toFixed(4) 
        : 'N/A';
    popup.select(".popup-activation")
        .text(`Activation: ${activation}`);

    // Handle gradient
    const gradient = typeof data.gradient === 'number' 
        ? data.gradient.toFixed(4) 
        : Array.isArray(data.gradient) 
        ? d3.mean(data.gradient).toFixed(4) 
        : 'N/A';
    popup.select(".popup-gradient")
        .text(`Gradient: ${gradient}`);

    // Sparkline for backpropagation visualization
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