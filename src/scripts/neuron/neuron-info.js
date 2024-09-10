let isOverNode = false;
let hidePopupTimeout;
let isOverPopup = false;
let lastMousePosition = { x: 0, y: 0 };

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

    // Strengthen the neon blue glow on hover
    d3.select(event.target)
        .style("stroke", "rgba(0, 255, 255, 1)")  // Same neon blue stroke
        .style("stroke-width", "6px")  // Increase stroke width on hover
        .style("filter", "drop-shadow(0 0 20px rgba(0, 255, 255, 1))");  // Brighter neon glow

    const x = isNaN(event.pageX) ? event.clientX : event.pageX;
    const y = isNaN(event.pageY) ? event.clientY : event.pageY;

    updateNeuronPopup(popup, x, y, {
        layerType: layerType,
        nodeIndex: nodeIndex,
        ...nodeData
    });

    popupGroup.raise();  // Bring popup group to front
    popup.style("display", "block");

    // Add mousemove event listener to the document
    document.addEventListener('mousemove', trackMouseMovement);
}

export function handleNeuronMouseleave(popup, event) {
    isOverNode = false;

    // Reduce the glow effect when leaving the node
    d3.select(event.target)
        .style("stroke", "rgba(0, 255, 255, 1)")  // Keep neon blue stroke
        .style("stroke-width", "4px")  // Revert to original width
        .style("filter", "drop-shadow(0 0 15px rgba(0, 100, 255, 1))");  // Reduce glow intensity

    // Check if the mouse is moving towards the popup
    const popupRect = popup.node().getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    if (isMovingTowardsPopup(mouseX, mouseY, popupRect)) {
        // If moving towards popup, set a timeout to hide it
        hidePopupTimeout = setTimeout(() => {
            if (!isOverPopup) {
                hideNeuronPopup(popup);
            }
        }, 100);
    } else {
        // If not moving towards popup, hide it immediately
        hideNeuronPopup(popup);
    }
}

function isMovingTowardsPopup(mouseX, mouseY, popupRect) {
    const deltaX = mouseX - lastMousePosition.x;
    const deltaY = mouseY - lastMousePosition.y;

    const isMovingRight = deltaX > 0 && mouseX < popupRect.left;
    const isMovingLeft = deltaX < 0 && mouseX > popupRect.right;
    const isMovingDown = deltaY > 0 && mouseY < popupRect.top;
    const isMovingUp = deltaY < 0 && mouseY > popupRect.bottom;

    return isMovingRight || isMovingLeft || isMovingDown || isMovingUp;
}

function trackMouseMovement(event) {
    lastMousePosition.x = event.clientX;
    lastMousePosition.y = event.clientY;
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

    if (layerIndex === 0) {
        // Input layer logic
        if (forwardData && forwardData.input && forwardData.input.length > 0) {
            const singleSample = data.epoch % forwardData.input.length;
            nodeData.inputValue = forwardData.input[singleSample][i];
            console.log('Input Value:', nodeData.inputValue);
        }
    } else if (layerIndex > 0 && layerIndex < layers.length - 1) {
        // Hidden layer logic
        console.log('Checking Hidden Layer Activations...');
        if (forwardData && forwardData.hidden_activation && forwardData.hidden_activation.length > layerIndex - 1) {
            console.log('Hidden Activation:', forwardData.hidden_activation[layerIndex - 1]);

            // Pre-activation and activation
            nodeData.preActivation = forwardData.hidden_activation[layerIndex - 1].pre_activation || 'N/A';
            nodeData.activation = forwardData.hidden_activation[layerIndex - 1].post_activation || 'N/A';
            console.log('Pre-activation:', nodeData.preActivation);
            console.log('Post-activation:', nodeData.activation);

            // Weight and bias
            nodeData.weight = data.weights_biases_data.hidden_weights[layerIndex - 1][i] || 'N/A';
            nodeData.bias = data.weights_biases_data.hidden_biases[layerIndex - 1][i] || 'N/A';
            console.log('Weight Avg:', nodeData.weight);
            console.log('Bias:', nodeData.bias);
        } else {
            console.log('Hidden Activation data missing or incomplete.');
        }
    } else if (layerIndex === layers.length - 1) {
        // Output layer logic
        console.log('Checking Output Layer Activations...');
        if (forwardData && forwardData.output_activation) {
            nodeData.preActivation = forwardData.output_activation.pre_activation || 'N/A';
            nodeData.activation = forwardData.output_activation.post_activation || 'N/A';
            console.log('Pre-activation:', nodeData.preActivation);
            console.log('Post-activation:', nodeData.activation);

            nodeData.weight = data.weights_biases_data.output_weights[i] || 'N/A';
            nodeData.bias = data.weights_biases_data.output_biases[i] || 'N/A';
            console.log('Weight Avg:', nodeData.weight);
            console.log('Bias:', nodeData.bias);
        } else {
            console.log('Output Activation data missing.');
        }
    }

    console.log('Final Node Data:', nodeData);
    return nodeData;
}

export function updateNeuronPopup(popup, x, y, data) {

    const xOffset = -60;
    const yOffset = -50;

    popup.attr("transform", `translate(${x + xOffset},${y + yOffset})`)
        .style("display", "block");

    popup.select(".popup-title")
        .text(`${data.layerType} Node ${data.nodeIndex}`);

    const formatValue = (value) => {
        if (typeof value === 'number') return value.toFixed(4);
        if (Array.isArray(value)) {
            const avg = d3.mean(value).toFixed(4);
            const min = d3.min(value).toFixed(4);
            const max = d3.max(value).toFixed(4);
            return `${avg}(Min: ${min}, Max: ${max})`;
        }
        return value || 'N/A';
    };

    if (data.layerType === "Input") {
        popup.select(".popup-weight").text(`Input Value: ${formatValue(data.inputValue)}`);
        popup.select(".popup-bias").text("");
        popup.select(".popup-pre-activation").text("");
        popup.select(".popup-activation").text("");
        popup.select(".popup-gradient").text("");
    } else if (data.layerType === "Hidden" || data.layerType === "Output") {
        popup.select(".popup-weight").text(`Weight Avg: ${formatValue(data.weight)}`);
        if (Array.isArray(data.weight)) {
            popup.select(".popup-weight").append("tspan")
                .attr("x", 15)
                .attr("dy", "1.2em")
                .text(`(${data.weight.length} incoming connections)`);
        }
        popup.select(".popup-bias").text(`Bias: ${formatValue(data.bias)}`);
        popup.select(".popup-pre-activation").text(`Weighted Sum: ${formatValue(data.preActivation)}`);
        popup.select(".popup-activation").text(`Activation: ${formatValue(data.activation)}`);
        popup.select(".popup-gradient").text(`Gradient: ${formatValue(data.gradient)}`);
    }

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

    // Add mouse enter and leave events to the popup
    popup.on("mouseenter", () => {
        isOverPopup = true;
        clearTimeout(hidePopupTimeout);
    });

    popup.on("mouseleave", () => {
        isOverPopup = false;
        if (!isOverNode) {
            hideNeuronPopup(popup);
        }
    });
}

export function hideNeuronPopup(popup) {
    popup.style("display", "none");
    // Remove the mousemove event listener when hiding the popup
    document.removeEventListener('mousemove', trackMouseMovement);
}