import { updateLossChart } from "./chart-logic.js";
import { stopTraining } from './event-handlers.js';

let nodes = []; // Keep this global to track all nodes for connections
let links = []; // Global array to track connections/links between nodes
let selectedNodeIndex = null;  // Track the index of the selected node

export function drawNeuralNetwork(layers, weights) {
    console.log("Drawing neural network with layers:", layers);
    console.log("Received weights:", weights);
    d3.select("#visualization").html(""); // Clear previous SVG

    const width = window.innerWidth;
    const height = window.innerHeight;
    const svg = d3.select("#visualization").append("svg")
        .attr("width", width)
        .attr("height", height);

    const layerSpacing = width / (layers.length + 1);
    const nodeRadius = 20;

    nodes = []; // Clear the global nodes array before redrawing
    links = []; // Clear the global links array before redrawing

    // Create nodes for each layer (including dynamic hidden layers)
    layers.forEach((layerSize, layerIndex) => {
        const x = layerSpacing * (layerIndex + 1); // Position each layer horizontally
        const ySpacing = height / (layerSize + 1); // Position nodes vertically within the layer

        // Create nodes within each layer
        for (let i = 0; i < layerSize; i++) {
            const y = ySpacing * (i + 1); // Calculate y position for each node

            let layerLabel;
            if (layerIndex === 0) {
                layerLabel = "Input";  // Label input layer
            } else if (layerIndex === layers.length - 1) {
                layerLabel = "Output"; // Label output layer
            } else {
                layerLabel = `Hidden Layer ${layerIndex}`; // Label hidden layers
            }

            // Create the visual node (circle)
            const node = svg.append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", nodeRadius)
                .style("fill", "rgba(255, 255, 255, 0.1)")
                .style("stroke", "white")
                .style("stroke-width", "2")
                .call(d3.drag()
                    .on("start", dragStarted)
                    .on("drag", dragged)
                    .on("end", dragEnded)
                )
                .on("mouseover", function () {
                    d3.select(this).style("stroke", "rgba(255, 99, 132, 1)").style("stroke-width", "4px");

                    // Display hover box with layer details
                    const boxWidth = 120;
                    const boxHeight = 50;
                    const boxX = parseFloat(d3.select(this).attr("cx")) - boxWidth / 2;
                    const boxY = parseFloat(d3.select(this).attr("cy")) - nodeRadius - boxHeight - 10;

                    const hoverGroup = svg.append("g").attr("class", "hover-box");
                    hoverGroup.append("rect")
                        .attr("x", boxX)
                        .attr("y", boxY)
                        .attr("width", boxWidth)
                        .attr("height", boxHeight)
                        .attr("fill", "white")
                        .attr("stroke", "rgba(255, 99, 132, 1)")
                        .attr("rx", 10)
                        .attr("ry", 10);

                    hoverGroup.append("text")
                        .attr("x", boxX + boxWidth / 2)
                        .attr("y", boxY + 20)
                        .attr("fill", "black")
                        .attr("font-size", "14px")
                        .attr("text-anchor", "middle")
                        .attr("class", "hover-text")
                        .text(`${layerLabel} Node`);

                    hoverGroup.append("text")
                        .attr("x", boxX + boxWidth / 2)
                        .attr("y", boxY + 40)
                        .attr("fill", "gray")
                        .attr("font-size", "12px")
                        .attr("text-anchor", "middle")
                        .attr("class", "hover-text")
                        .text(`Index: ${i}`);
                })
                .on("mouseout", function () {
                    d3.select(this).style("stroke", "white").style("stroke-width", "2px");
                    svg.selectAll(".hover-box").remove(); // Remove the hover group, including box and text
                });

            nodes.push({ layerIndex, i, x, y, node: node.node() }); // Add node to global node list
        }
    });

    // Create links (connections between nodes in adjacent layers)
    nodes.forEach(sourceNode => {
        if (sourceNode.layerIndex < layers.length - 1) {
            const nextLayerNodes = nodes.filter(node => node.layerIndex === sourceNode.layerIndex + 1);
            console.log(`Creating connections from layer ${sourceNode.layerIndex} to layer ${sourceNode.layerIndex + 1}`);
            console.log(`Number of nodes in current layer: ${nodes.filter(node => node.layerIndex === sourceNode.layerIndex).length}`);
            console.log(`Number of nodes in next layer: ${nextLayerNodes.length}`);

            nextLayerNodes.forEach((targetNode, j) => {
                console.log(`Creating connection from node ${sourceNode.i} to node ${j}`);
                
                // Determine the weight
                let weight;
                if (sourceNode.layerIndex === 0 && weights && weights.input_weights) {
                    weight = weights.input_weights[j] ? weights.input_weights[j][sourceNode.i] : null;
                } else if (sourceNode.layerIndex === layers.length - 2 && weights && weights.output_weights) {
                    weight = weights.output_weights[j] ? weights.output_weights[j][sourceNode.i] : null;
                } else if (weights && weights.hidden_weights && weights.hidden_weights[sourceNode.layerIndex]) {
                    weight = weights.hidden_weights[sourceNode.layerIndex][j] ? weights.hidden_weights[sourceNode.layerIndex][j][sourceNode.i] : null;
                }

                console.log(`Weight for this connection: ${weight !== null ? weight : 'Not available'}`);

                const line = svg.append("line")
                    .attr("x1", sourceNode.x)
                    .attr("y1", sourceNode.y)
                    .attr("x2", targetNode.x)
                    .attr("y2", targetNode.y)
                    .attr("stroke", "#ccc")
                    .attr("stroke-width", 2)
                    .attr("class", `line-${sourceNode.layerIndex}-${sourceNode.i}-${targetNode.i}`);

                line.on("mouseover", function() {
                    d3.select(this).attr("stroke", "rgba(255, 99, 132, 1)").attr("stroke-width", 4);
                    
                    let weightText = weight !== null && !isNaN(weight) ? Number(weight).toFixed(4) : 'N/A';
                    
                    const tooltip = svg.append("text")
                        .attr("x", (sourceNode.x + targetNode.x) / 2)
                        .attr("y", (sourceNode.y + targetNode.y) / 2 - 10)
                        .attr("fill", "white")
                        .attr("font-size", "14px")
                        .attr("text-anchor", "middle")
                        .text(`Weight: ${weightText}`);

                    d3.select(this).on("mouseout", function() {
                        d3.select(this).attr("stroke", "#ccc").attr("stroke-width", 2);
                        tooltip.remove();
                    });
                });

                links.push({ source: sourceNode, target: targetNode, line, weight });
            });
        }
    });
}

console.log(`Total number of links created: ${links.length}`);
// Drag and drop behavior for the nodes
export function dragStarted(event, d) {
    d3.select(this).raise().attr("stroke", "black");
}

export function dragged(event, d) {
    const draggedNode = nodes.find(n => n.node === this);

    if (!draggedNode) {
        console.error("Dragged node not found.");
        return;
    }

    // Move the node
    d3.select(this)
        .attr("cx", event.x)
        .attr("cy", event.y);

    // Update the node's position in the global nodes array
    draggedNode.x = event.x;
    draggedNode.y = event.y;

    // Update the connections as the node is dragged
    updateConnections(draggedNode);

    // Ensure the svg reference is captured in the scope of this function
    const svg = d3.select("#visualization svg");
    const nodeRadius = 20;  // Define nodeRadius if not globally available
    const boxWidth = 120;  // Define box width
    const boxHeight = 50;   // Define box height

    // Move the hover box and text together
    svg.selectAll(".hover-box rect")
        .attr("x", event.x - boxWidth / 2)
        .attr("y", event.y - nodeRadius - boxHeight - 10);

    svg.selectAll(".hover-text")
        .attr("x", event.x)
        .attr("y", (d, i) => event.y - nodeRadius - boxHeight - 10 + (i + 1) * 20);
}

export function dragEnded(event, d) {
    d3.select(this).attr("stroke", "white");
}

export function updateConnections(draggedNode) {
    links.forEach(link => {
        if (link.source === draggedNode || link.target === draggedNode) {
            link.line
                .attr("x1", link.source.x)
                .attr("y1", link.source.y)
                .attr("x2", link.target.x)
                .attr("y2", link.target.y);
        }
    });
}

export function animateDataFlow(data) {
    console.log("Received data in animateDataFlow:", data); // Log the data
    const svg = d3.select("svg");

    // If data is not an array, process it as a single object
    if (!Array.isArray(data)) {
        data = [data];  // Convert to array
        console.log("Data is not an array, converting:", data);
    }

    data.forEach((epochData, index) => {
        console.log(`Processing epoch ${index + 1}:`, epochData);

        if (stopTraining) return;

        const forwardDuration = epochData.forward_data.forward_time * 1000; // Adjust duration as needed
        const backwardDuration = epochData.backward_data.backward_time * 1000; // Adjust duration as needed

        console.log(`Triggering forward pass for epoch ${index + 1}, duration: ${forwardDuration}`);
        animateForwardPass(epochData.forward_data, svg, forwardDuration);

        console.log(`Triggering backward pass for epoch ${index + 1}, duration: ${backwardDuration}`);
        animateBackwardPass(epochData.backward_data, svg, backwardDuration);

        console.log(`Updating loss chart for epoch ${index + 1}, loss: ${epochData.loss}`);
        updateLossChart(epochData.epoch, epochData.loss);
    });

    // Reapply selection styling after each epoch
    if (selectedNodeIndex !== null) {
        const selectedNode = nodes[selectedNodeIndex];
        d3.select(selectedNode.node)
            .style("stroke", "rgba(255, 99, 132, 1)")
            .style("stroke-width", "4px");

        // Reapply the label
        svg.selectAll(".layer-label").remove();  // Remove any existing label
        svg.append("text")
            .attr("x", selectedNode.x)
            .attr("y", selectedNode.y - 25)
            .attr("fill", "white")
            .attr("font-size", "14px")
            .attr("class", "layer-label")
            .text("Layer");
    }
}

export function animateForwardPass(forwardData, svg, duration) {
    const inputNodes = parseInt(document.getElementById('inputNodes').value);  // Dynamically get the number of input nodes
    console.log("Animating forward pass with input nodes:", inputNodes);

    // Loop through each batch (array) in the input
    forwardData.input.forEach((inputBatch, batchIndex) => {
        console.log(`Animating batch ${batchIndex + 1} with ${inputBatch.length} inputs`);

        inputBatch.forEach((input, index) => {
            if (index >= inputNodes) {
                console.warn(`Skipping input node ${index}, expected ${inputNodes}`);
                return;
            }

            const inputNode = nodes.find(node => node.layerIndex === 0 && node.i === index);

            if (!inputNode) {
                console.warn(`Input node not found for index ${index}`);
                return;
            }

            console.log(`Animating light from input node ${index} in batch ${batchIndex}, value: ${input}`);
            animateLightThroughLayer(inputNode, forwardData.hidden_activation, duration * 50, svg, "forward");
        });
    });

    console.log(`Received input batches: ${forwardData.input.length}, expected: ${inputNodes}`);
}

// Animation for backward pass
export function animateBackwardPass(backwardData, svg, duration) {
    const hiddenNodes = nodes.filter(node => node.layerIndex === 1);
    const outputNodes = nodes.filter(node => node.layerIndex === 2);

    outputNodes.forEach((outputNode, i) => {
        animateLightThroughLayer(outputNode, hiddenNodes, duration * 50, svg, "backward");
    });

    hiddenNodes.forEach((hiddenNode, i) => {
        animateLightThroughLayer(hiddenNode, nodes.filter(node => node.layerIndex === 0), duration * 50, svg, "backward");
    });
}

// Function to animate light through the layer without using getPointAtLength
export function animateLightThroughLayer(node, nextLayerData, duration, svg, direction) {
    // Ensure the node is valid
    if (!node || typeof node.layerIndex === 'undefined') {
        console.error("Invalid node or missing layerIndex", node);
        return;
    }

    // Check if the node is in the last layer
    if (node.layerIndex >= Math.max(...nodes.map(n => n.layerIndex))) {
        console.warn("Node is in the last layer, no further layers to animate.");
        return;  // Exit the function if there is no next layer
    }

    // Filter for the nodes in the next layer
    const nextLayerNodes = nodes.filter(n => n.layerIndex === node.layerIndex + 1);

    if (nextLayerNodes.length === 0) {
        console.warn("No nodes found in the next layer", node.layerIndex + 1);
        return;  // If there are no nodes in the next layer, exit the function
    }

    // Animate the connection between this node and the nodes in the next layer
    nextLayerNodes.forEach((targetNode, i) => {
        if (!targetNode || typeof targetNode.layerIndex === 'undefined') {
            console.error("Invalid target node or missing layerIndex", targetNode);
            return;
        }

        // Create or update the line
        let path = svg.select(`.line-${node.layerIndex}-${i}-${targetNode.i}`);
        if (path.empty()) {
            path = svg.append("line")
                .attr("x1", node.x)
                .attr("y1", node.y)
                .attr("x2", targetNode.x)
                .attr("y2", targetNode.y)
                .attr("stroke", "rgba(255, 255, 255, 0.3)")  // Soft, subtle line
                .attr("stroke-width", 6);
        }

        const light = svg.append("circle")
            .attr("r", 8)
            .attr("fill", "rgba(255, 255, 255, 0.9)")  // Bright white color for the light
            .style("stroke", "rgba(200, 200, 200, 0.7)")  // Light gray stroke for a soft glow
            .style("stroke-width", 6);  // Glow effect with a wider stroke

        // Function to manually interpolate the light along the line
        const animateAlongLine = (startX, startY, endX, endY, light, duration) => {
            light.transition()
                .duration(duration)
                .ease(d3.easeLinear)
                .attrTween("transform", function () {
                    return function (t) {
                        const currentX = startX + (endX - startX) * t;
                        const currentY = startY + (endY - startY) * t;
                        return `translate(${currentX},${currentY})`;
                    };
                })
                .on("end", function () {
                    d3.select(this).remove();  // Remove the light once the animation is complete

                    // Recursive call for the next layer's animation
                    if (direction === "forward" && targetNode && targetNode.layerIndex < nodes.length - 1) {
                        animateLightThroughLayer(targetNode, nextLayerData, duration, svg, "forward");
                    }
                });
        };

        // Animate the light along the line
        animateAlongLine(node.x, node.y, targetNode.x, targetNode.y, light, duration);
    });
}

// Function to clear the neural network visualization
export function clearNetwork() {
    d3.select("#visualization").html(""); // Clear the SVG area
    nodes = [];
    links = [];
}

