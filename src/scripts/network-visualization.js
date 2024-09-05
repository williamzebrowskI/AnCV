import { updateLossChart } from "./chart-logic.js";
import { stopTraining } from './event-handlers.js';

let nodes = []; // Keep this global to track all nodes for connections
let links = []; // Global array to track connections/links between nodes

export function drawNeuralNetwork(layers, weights) {
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

    layers.forEach((layerSize, layerIndex) => {
        const x = layerSpacing * (layerIndex + 1);
        const ySpacing = height / (layerSize + 1);
    
        for (let i = 0; i < layerSize; i++) {
            const y = ySpacing * (i + 1);
    
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
                );
    
            // Add a debug log to check each node creation
            // console.log(`Node created: Layer ${layerIndex}, Index ${i}, Node:`, node);
    
            nodes.push({ layerIndex, i, x, y, node });
        }
    });

    // Draw connections
    nodes.forEach(sourceNode => {
        if (sourceNode.layerIndex > 0) {
            const prevLayerNodes = nodes.filter(node => node.layerIndex === sourceNode.layerIndex - 1);
    
            prevLayerNodes.forEach((targetNode, j) => {
                const weight = weights && weights[`hidden_weights`] && weights[`hidden_weights`][j]
                    ? weights[`hidden_weights`][j][sourceNode.i]
                    : 0.5;

                const line = svg.append("line")
                    .attr("x1", targetNode.x)
                    .attr("y1", targetNode.y)
                    .attr("x2", sourceNode.x)
                    .attr("y2", sourceNode.y)
                    .attr("stroke", "#ccc")
                    .attr("stroke-width", 2)
                    .attr("class", `line-${sourceNode.layerIndex}-${sourceNode.i}-${targetNode.i}`) // Unique class for each connection
                    .on("mouseover", function () {
                        d3.select(this).attr("stroke", "rgba(255, 99, 132, 1)").attr("stroke-width", 4); 

                        const tooltip = svg.append("text")
                            .attr("x", (targetNode.x + sourceNode.x) / 2)
                            .attr("y", (targetNode.y + sourceNode.y) / 2 - 10)
                            .attr("fill", "white")
                            .attr("font-size", "14px")
                            .attr("text-anchor", "middle")
                            .text(`Weight: ${(weight || 0).toFixed(4)}`);

                        d3.select(this).on("mouseout", function () {
                            d3.select(this).attr("stroke", "#ccc").attr("stroke-width", 2); 
                            tooltip.remove();
                        });
                    });

                links.push({ source: sourceNode, target: targetNode, line });
            });
        }
    });
}

// Drag and drop behavior for the nodes
export function dragStarted(event, d) {
    d3.select(this).raise().attr("stroke", "black");
}

export function dragged(event, d) {
    const draggedNode = nodes.find(n => n.node.node() === this);

    // Move the node
    d3.select(this)
        .attr("cx", event.x)
        .attr("cy", event.y);

    // Update the node's position in the global nodes array
    draggedNode.x = event.x;
    draggedNode.y = event.y;

    // Update the connections as the node is dragged
    updateConnections(draggedNode);
}

export function dragEnded(event, d) {
    d3.select(this).attr("stroke", "white");
}

export function updateConnections(draggedNode) {
    // Update lines connected to the dragged node (outgoing connections)
    nodes.forEach(targetNode => {
        if (targetNode.layerIndex === draggedNode.layerIndex - 1) {
            d3.select(`.line-${draggedNode.layerIndex}-${draggedNode.i}-${targetNode.i}`)
                .attr("x1", targetNode.x)
                .attr("y1", targetNode.y)
                .attr("x2", draggedNode.x)
                .attr("y2", draggedNode.y);
        } else if (targetNode.layerIndex === draggedNode.layerIndex + 1) {
            d3.select(`.line-${targetNode.layerIndex}-${targetNode.i}-${draggedNode.i}`)
                .attr("x1", draggedNode.x)
                .attr("y1", draggedNode.y)
                .attr("x2", targetNode.x)
                .attr("y2", targetNode.y);
        }
    });
}

export function animateDataFlow(data) {
    console.log("Received data in animateDataFlow:", data); // Log the data
    const svg = d3.select("svg");

    // If data is not an array, process it as a single object
    if (!Array.isArray(data)) {
        data = [data];  // Convert to array
    }

    data.forEach((epochData) => {
        if (stopTraining) return;

        const forwardDuration = epochData.forward_data.forward_time * 1000; // Adjust duration as needed
        const backwardDuration = epochData.backward_data.backward_time * 1000; // Adjust duration as needed

        // Trigger forward pass animation
        animateForwardPass(epochData.forward_data, svg, forwardDuration);
        // Trigger backward pass animation
        animateBackwardPass(epochData.backward_data, svg, backwardDuration);

        updateLossChart(epochData.epoch, epochData.loss);
    });
}

export function animateForwardPass(forwardData, svg, duration) {
    forwardData.input.forEach((input, index) => {
        const inputNode = nodes.find(node => node.layerIndex === 0 && node.i === index);
        
        if (!inputNode) {
            console.warn(`Input node not found for index ${index}`);
            return;
        }
        
        animateLightThroughLayer(inputNode, forwardData.hidden_activation, duration * 50, svg, "forward");
    });
}

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

        // Create a path (line) between the nodes
        const path = svg.append("line")
            .attr("x1", node.x)
            .attr("y1", node.y)
            .attr("x2", targetNode.x)
            .attr("y2", targetNode.y)
            .attr("stroke", "rgba(255, 255, 255, 0.3)")  // Soft, subtle line
            .attr("stroke-width", 6);

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
// // Function to clear the neural network visualization
export function clearNetwork() {
    d3.select("#visualization").html(""); // Clear the SVG area
    nodes = [];
    links = [];
}