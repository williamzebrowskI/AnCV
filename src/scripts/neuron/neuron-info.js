// neuron-info.js

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
            const avg = d3.mean(value).toFixed(4);
            const [min, max] = value.length > 1 ? [d3.min(value).toFixed(4), d3.max(value).toFixed(4)] : [null, null];
            return { avg, min, max, hasMinMax: value.length > 1 };
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
            .text(`Weight Avg: ${weightInfo.avg}`)
            .append("tspan")
            .attr("x", 30)
            .attr("dy", weightInfo.hasMinMax ? "1.2em" : 0)
            .text(weightInfo.hasMinMax ? `Min: ${weightInfo.min}, Max: ${weightInfo.max}` : "");

        popup.select(".popup-bias").text(`Bias: ${formatValue(data.bias)}`);
        popup.select(".popup-pre-activation").text(`Weighted Sum: ${formatValue(data.preActivation)}`);
        popup.select(".popup-activation").text(`Activation: ${formatValue(data.activation)}`);
        popup.select(".popup-gradient").text(`Gradient: ${formatValue(data.gradient)}`);

        // Update activation graph
        updateActivationMap(popup, data.activation);
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

function updateActivationMap(popup, activation) {
    const graphWidth = 210;
    const graphHeight = 80;
    const margin = { top: 5, right: 5, bottom: 20, left: 25 };
    const width = graphWidth - margin.left - margin.right;
    const height = graphHeight - margin.top - margin.bottom;

    // Get existing data points
    let activationData = popup.select(".activation-line").datum() || [];

    // Add new data point if it's a valid number
    if (typeof activation === 'number' && !isNaN(activation)) {
        activationData.push(activation);
    }

    // Filter out any NaN or undefined values
    activationData = activationData.filter(d => typeof d === 'number' && !isNaN(d));

    // Keep only the last 50 data points
    const maxDataPoints = 50;
    if (activationData.length > maxDataPoints) {
        activationData = activationData.slice(-maxDataPoints);
    }

    // Only proceed if we have valid data points
    if (activationData.length > 0) {
        const x = d3.scaleLinear()
            .domain([0, activationData.length - 1])
            .range([0, width]);

        // Set y domain to accommodate GeLU's range (including small negative values)
        const yDomain = [
            Math.min(-0.1, d3.min(activationData)),
            Math.max(1, d3.max(activationData))
        ];

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
            .attr("class", "activation-line")
            .attr("fill", "none")
            .attr("stroke", "rgba(0, 255, 255, 1)")
            .attr("stroke-width", 2)
            .attr("d", line)
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Add label for GeLU activation
        svg.append("text")
            .attr("x", width / 2 + margin.left)
            .attr("y", margin.top - 5)
            .attr("text-anchor", "middle")
            .attr("fill", "rgba(0, 255, 255, 0.7)")
            .attr("font-size", "10px")
            .text("Activation");
    } else {
        // If no valid data, clear the path
        popup.select(".activation-line").attr("d", null);
    }
}