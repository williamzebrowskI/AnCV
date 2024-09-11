// neuron-info.js

let isOverNode = false;
let isOverPopup = false;
let lastMousePosition = { x: 0, y: 0 };
let hidePopupTimeout;

let isSidebarCollapsed = false;

export function createNeuronPopup(svg) {
    const popup = svg.append("g")
        .attr("class", "neuron-popup")
        .style("display", "none")
        .style("pointer-events", "all");

    popup.append("rect")
        .attr("width", 240)
        .attr("height", 250)
        .attr("fill", "url(#popupGradient)")
        .attr("stroke", "rgba(0, 255, 255, 1)")
        .attr("stroke-width", 2)
        .attr("rx", 15)
        .attr("ry", 15)
        .style("filter", "drop-shadow(0 0 15px rgba(0, 100, 255, 1))");

    svg.append("defs").append("linearGradient")
        .attr("id", "popupGradient")
        .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%")
        .selectAll("stop")
        .data([
            { offset: "0%", color: "#0f0f0f" },
            { offset: "100%", color: "#2f2f2f" }
        ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    popup.append("text")
        .attr("class", "popup-title")
        .attr("x", 15).attr("y", 30)
        .attr("fill", "rgba(255, 99, 132, 1)")
        .style("font-family", "'Orbitron', sans-serif")
        .style("font-weight", "bold")
        .style("font-size", "18px")
        .style("text-shadow", "0 0 8px rgba(255, 99, 132, 1)");

    ["weight", "bias", "pre-activation", "activation", "gradient"].forEach((field, index) => {
        popup.append("text")
            .attr("class", `popup-${field}`)
            .attr("x", 15).attr("y", 60 + index * 30)
            .attr("fill", "#ffffff")
            .style("font-family", "'Orbitron', sans-serif")
            .style("font-size", "14px")
            .style("text-shadow", "0 0 6px rgba(255, 99, 132, 1)")
            .style("animation", "glowAnimation 2s infinite");
    });

    popup.append("path")
        .attr("class", "sparkline")
        .attr("fill", "none")
        .attr("stroke", "rgba(0, 255, 255, 1)")
        .attr("stroke-width", 2)
        .style("filter", "drop-shadow(0 0 8px rgba(0, 255, 255, 1))");

    svg.append("style").text(`
        @keyframes glowAnimation {
            0%, 100% { text-shadow: 0 0 8px rgba(255, 99, 132, 1); }
            50% { text-shadow: 0 0 12px rgba(255, 99, 132, 1); }
        }
    `);

    return d3.select(popup.node());
}

export function handleNeuronMouseover(popupGroup, popup, event, layerType, nodeIndex, nodeData) {
    isOverNode = true;
    clearTimeout(hidePopupTimeout);

    d3.select(event.target)
        .style("stroke", "rgba(0, 255, 255, 1)")
        .style("stroke-width", "6px")
        .style("filter", "drop-shadow(0 0 20px rgba(0, 255, 255, 1))");

    const x = event.pageX || event.clientX;
    const y = event.pageY || event.clientY;

    updateNeuronPopup(popup, x, y, { layerType, nodeIndex, ...nodeData });

    popupGroup.raise();
    popup.style("display", "block");

    document.addEventListener('mousemove', trackMouseMovement);
}

export function handleNeuronMouseleave(popup, event) {
    isOverNode = false;

    d3.select(event.target)
        .style("stroke", "rgba(0, 255, 255, 1)")
        .style("stroke-width", "4px")
        .style("filter", "drop-shadow(0 0 15px rgba(0, 100, 255, 1))");

    const popupRect = popup.node().getBoundingClientRect();
    const { clientX: mouseX, clientY: mouseY } = event;

    if (isMovingTowardsPopup(mouseX, mouseY, popupRect)) {
        hidePopupTimeout = setTimeout(() => {
            if (!isOverPopup) hideNeuronPopup(popup);
        }, 100);
    } else {
        hideNeuronPopup(popup);
    }
}

function isMovingTowardsPopup(mouseX, mouseY, popupRect) {
    const deltaX = mouseX - lastMousePosition.x;
    const deltaY = mouseY - lastMousePosition.y;

    return (deltaX > 0 && mouseX < popupRect.left) ||
           (deltaX < 0 && mouseX > popupRect.right) ||
           (deltaY > 0 && mouseY < popupRect.top) ||
           (deltaY < 0 && mouseY > popupRect.bottom);
}

const trackMouseMovement = (event) => {
    lastMousePosition = { x: event.clientX, y: event.clientY };
};

export function getNodeData(layerIndex, i, forwardData, data, layers) {
    const nodeData = {
        weight: 'N/A', bias: 'N/A', preActivation: 'N/A',
        activation: 'N/A', gradient: 'N/A', backpropHistory: []
    };

    if (layerIndex === 0 && forwardData?.input?.length > 0) {
        const singleSample = data.epoch % forwardData.input.length;
        nodeData.inputValue = forwardData.input[singleSample][i];
    } else if (layerIndex > 0 && layerIndex < layers.length - 1) {
        const hiddenActivation = forwardData?.hidden_activation?.[layerIndex - 1];
        if (hiddenActivation) {
            nodeData.preActivation = hiddenActivation.pre_activation;
            nodeData.activation = hiddenActivation.post_activation;
            nodeData.weight = data.weights_biases_data.hidden_weights[layerIndex - 1][i];
            nodeData.bias = data.weights_biases_data.hidden_biases[layerIndex - 1][i];
        }
    } else if (layerIndex === layers.length - 1 && forwardData?.output_activation) {
        nodeData.preActivation = forwardData.output_activation.pre_activation;
        nodeData.activation = forwardData.output_activation.post_activation;
        nodeData.weight = data.weights_biases_data.output_weights[i];
        nodeData.bias = data.weights_biases_data.output_biases[i];
    }

    return nodeData;
}

export function updateNeuronPopup(popup, x, y, data) {
    // Adjust the x position based on the sidebar state and move to the right of the neuron
    const sidebarWidth = isSidebarCollapsed ? 30 : 300; // Adjust these values as needed
    const popupWidth = 240; // Width of the popup
    const popupHeight = 225; // Height of the popup
    const neuronRadius = 225; // Approximate radius of the neuron circle
    const spacing = 15; // Space between neuron and popup

    // Position to the right of the neuron
    const adjustedX = x - sidebarWidth + neuronRadius + spacing;
    
    // Adjust y position to center the popup vertically with the neuron
    const adjustedY = y - (popupHeight / 2);

    popup.attr("transform", `translate(${adjustedX},${adjustedY})`)
        .style("display", "block");

    popup.select(".popup-title").text(`${data.layerType} Node ${data.nodeIndex}`);

    const formatValue = (value) => {
        if (typeof value === 'number') return value.toFixed(4);
        if (Array.isArray(value)) {
            const avg = d3.mean(value).toFixed(4);
            const [min, max] = value.length > 1 ? [d3.min(value).toFixed(4), d3.max(value).toFixed(4)] : [null, null];
            return { avg, min, max, hasMinMax: value.length > 1 };
        }
        return value || 'N/A';
    };

    if (data.layerType === "Input") {
        popup.select(".popup-weight").text(`Input Value: ${formatValue(data.inputValue)}`);
        ["bias", "pre-activation", "activation", "gradient"].forEach(field => 
            popup.select(`.popup-${field}`).text("")
        );
    } else {
        const weightInfo = formatValue(data.weight);
        popup.select(".popup-weight")
            .text(`Weight Avg: ${weightInfo.avg}`)
            .append("tspan")
            .attr("x", 30)
            .attr("dy", weightInfo.hasMinMax ? "1.2em" : 0)
            .text(weightInfo.hasMinMax ? `Min: ${weightInfo.min}, Max: ${weightInfo.max}` : "");

        popup.select(".popup-bias").text(`Bias: ${formatValue(data.bias)}`);
        popup.select(".popup-pre-activation").text(`Weighted Sum: ${formatValue(data.preActivation)}`);
        popup.select(".popup-activation").text(`Activation: ${formatValue(data.activation)}`);
        popup.select(".popup-gradient").text(`Gradient: ${formatValue(data.gradient)}`);
    }

    if (data.backpropHistory?.length > 0) {
        const lineGenerator = d3.line()
            .x((_, i) => i * 20)
            .y(d => d * -20);
        popup.select(".sparkline")
            .attr("d", lineGenerator(data.backpropHistory))
            .attr("transform", "translate(10, 200)");
    } else {
        popup.select(".sparkline").attr("d", "");
    }

    popup.on("mouseenter", () => {
        isOverPopup = true;
        clearTimeout(hidePopupTimeout);
    }).on("mouseleave", () => {
        isOverPopup = false;
        if (!isOverNode) hideNeuronPopup(popup);
    });
}

export function hideNeuronPopup(popup) {
    popup.style("display", "none");
    document.removeEventListener('mousemove', trackMouseMovement);
}

// Add this function to update the sidebar state
export function updateSidebarState(collapsed) {
    isSidebarCollapsed = collapsed;
}