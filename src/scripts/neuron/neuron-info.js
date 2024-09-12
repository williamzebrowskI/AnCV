// neuron-info.js

import { updateActivationMap } from "./activation-chart.js"

const activationHistories = new Map();

let isOverNode = false;
let isOverPopup = false;
let lastMousePosition = { x: 0, y: 0 };
let hidePopupTimeout;

let isSidebarCollapsed = false;
let popupOffset = { x: 0, y: 0 };

export function createNeuronPopup(svg) {
    const popup = svg.append("g")
        .attr("class", "neuron-popup")
        .style("display", "none")
        .style("pointer-events", "all");

    popup.append("rect")
        .attr("width", 240)
        .attr("height", 340)  // Increased height to accommodate the activation graph
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

    // Add SVG for activation graph
    const graphGroup = popup.append("g")
        .attr("class", "activation-graph")
        .attr("transform", "translate(15, 240)");

    graphGroup.append("rect")
        .attr("width", 210)
        .attr("height", 80)
        .attr("fill", "none")
        .attr("stroke", "rgba(0, 255, 255, 0.5)");

    graphGroup.append("path")
        .attr("class", "activation-line")
        .attr("fill", "none")
        .attr("stroke", "rgba(0, 255, 255, 1)")
        .attr("stroke-width", 2);

    svg.append("style").text(`
        @keyframes glowAnimation {
            0%, 100% { text-shadow: 0 0 8px rgba(255, 99, 132, 1); }
            50% { text-shadow: 0 0 12px rgba(255, 99, 132, 1); }
        }
    `);
    popup.on("mouseenter", () => {
        isOverPopup = true;
        clearTimeout(hidePopupTimeout);
    }).on("mouseleave", () => {
        isOverPopup = false;
        if (!isOverNode) {
            hidePopupTimeout = setTimeout(() => hideNeuronPopup(popup), 300);
        }
    });

    return d3.select(popup.node());
}

export function handleNeuronMouseover(popupGroup, popup, event, layerType, nodeIndex, nodeData) {
    isOverNode = true;
    clearTimeout(hidePopupTimeout);

    d3.select(event.target)
        .style("stroke", "rgba(0, 255, 255, 1)")
        .style("stroke-width", "6px")
        .style("filter", "drop-shadow(0 0 20px rgba(0, 255, 255, 1))");

    setPopupOffset();

    updateNeuronPopup(popup, event.target.cx.baseVal.value, event.target.cy.baseVal.value, { layerType, nodeIndex, ...nodeData });

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

    if (!isOverPopup) {
        hidePopupTimeout = setTimeout(() => hideNeuronPopup(popup), 300);
    }
}

const trackMouseMovement = (event) => {
    lastMousePosition = { x: event.clientX, y: event.clientY };
};

export function getNodeData(layerIndex, i, forwardData, data, layers) {
    console.log('getNodeData called with:', { layerIndex, i, forwardData, data, layers });

    const nodeData = {
        weight: 'N/A', bias: 'N/A', preActivation: 'N/A',
        activation: 'N/A', gradient: 'N/A', backpropHistory: []
    };

    if (!data || !forwardData) {
        console.log('Data or forwardData is undefined');
        return nodeData;
    }

    const currentEpoch = data.epoch;
    const sampleIndex = 0; // We'll use the first sample in the batch for visualization

    const formatValue = (value) => {
        if (typeof value === 'number') {
            return value.toFixed(4);
        } else if (Array.isArray(value)) {
            return value.map(formatValue);
        }
        return value;
    };

    if (layerIndex === 0) {
        // Input layer
        nodeData.inputValue = formatValue(forwardData.input[sampleIndex][i]);
    } else if (layerIndex > 0 && layerIndex < layers.length - 1) {
        // Hidden layers
        const hiddenLayerIndex = layerIndex - 1;
        const hiddenActivation = forwardData.hidden_activation[hiddenLayerIndex];
        
        if (hiddenActivation) {
            nodeData.preActivation = formatValue(hiddenActivation.pre_activation[sampleIndex][i]);
            nodeData.activation = formatValue(hiddenActivation.post_activation[sampleIndex][i]);
        }
        
        if (data.weights_biases_data) {
            nodeData.weight = data.weights_biases_data.hidden_weights[hiddenLayerIndex][i];
            nodeData.bias = formatValue(data.weights_biases_data.hidden_biases[hiddenLayerIndex][i]);
        }
        
        if (data.backward_data && data.backward_data.hidden_grad) {
            nodeData.gradient = formatValue(data.backward_data.hidden_grad[hiddenLayerIndex][sampleIndex][i]);
        }
    } else if (layerIndex === layers.length - 1) {
        // Output layer
        nodeData.activation = formatValue(forwardData.output[sampleIndex][i]);
        
        if (data.weights_biases_data) {
            nodeData.weight = data.weights_biases_data.output_weights[i];
            nodeData.bias = formatValue(data.weights_biases_data.output_biases[i]);
        }
        
        if (data.backward_data && data.backward_data.output_grad) {
            nodeData.gradient = formatValue(data.backward_data.output_grad[sampleIndex][i]);
        }
    }

    console.log(`Node data for layer ${layerIndex}, node ${i}:`, nodeData);
    return nodeData;
}

function setPopupOffset() {
    const popupWidth = 240; // Width of the popup
    const popupHeight = 340; // Updated height of the popup
    const neuronRadius = 20; // Actual radius of the neuron circle
    const spacing = 15; // Space between neuron and popup

    // Calculate offset
    popupOffset.x = neuronRadius + spacing;
    popupOffset.y = -popupHeight / 2;
}

export function updateNeuronPopup(popup, neuronX, neuronY, data) {
    updatePopupPosition(popup, neuronX, neuronY);
    popup.style("display", "block");

    popup.select(".popup-title").text(`${data.layerType} Node ${data.nodeIndex}`);

    const formatValue = (value) => {
        if (typeof value === 'number') return value.toFixed(4);
        if (Array.isArray(value)) {
            const numericValues = value.filter(v => typeof v === 'number');
            if (numericValues.length === 0) return 'N/A';
            const avg = d3.mean(numericValues).toFixed(4);
            const [min, max] = numericValues.length > 1
                ? [d3.min(numericValues).toFixed(4), d3.max(numericValues).toFixed(4)]
                : [null, null];
            return { avg, min, max, hasMinMax: numericValues.length > 1 };
        }
        return value || 'N/A';
    };

    // Update popup content
    if (data.layerType === "Input") {
        popup.select(".popup-weight").text(`Input Value: ${formatValue(data.inputValue)}`);
        ["bias", "pre-activation", "activation", "gradient"].forEach(field =>
            popup.select(`.popup-${field}`).text("")
        );
    } else {
        const weightInfo = formatValue(data.weight);
        popup.select(".popup-weight")
            .text(`Weight: ${typeof weightInfo === 'object' ? weightInfo.avg : weightInfo}`)
            .append("tspan")
            .attr("x", 30)
            .attr("dy", weightInfo.hasMinMax ? "1.2em" : 0)
            .text(weightInfo.hasMinMax ? `Min: ${weightInfo.min}, Max: ${weightInfo.max}` : "");

        popup.select(".popup-bias").text(`Bias: ${formatValue(data.bias)}`);
        popup.select(".popup-pre-activation").text(`Weighted Sum: ${formatValue(data.preActivation)}`);
        popup.select(".popup-activation").text(`Activation: ${formatValue(data.activation)}`);
        popup.select(".popup-gradient").text(`Gradient: ${formatValue(data.gradient)}`);

        const nodeId = `${data.layerType}-${data.nodeIndex}`;
        let history = activationHistories.get(nodeId) || [];
        if (typeof data.activation === 'number' && !isNaN(data.activation)) {
            history.push(data.activation);
        }
        if (history.length > 50) history = history.slice(-50);
        activationHistories.set(nodeId, history);
        
        console.log("About to call updateActivationMap with:", { nodeId, history });
        updateActivationMap(popup, history, nodeId);
    }

    // Update sparkline if backpropHistory is available
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
}

export function hideNeuronPopup(popup) {
    popup.style("display", "none");
    document.removeEventListener('mousemove', trackMouseMovement);
}

export function updateSidebarState(collapsed) {
    isSidebarCollapsed = collapsed;
}

export function updatePopupPosition(popup, neuronX, neuronY) {
    const x = neuronX + popupOffset.x;
    const y = neuronY + popupOffset.y;
    popup.attr("transform", `translate(${x},${y})`);
}