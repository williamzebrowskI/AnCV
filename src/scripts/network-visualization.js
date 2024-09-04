import { updateLossChart } from "./chart-logic.js";
import { stopTraining } from './event-handlers.js';

let nodes = []; // Keep this global to track all nodes for connections
let links = []; // Global array to track connections/links between nodes

export function drawNeuralNetwork(layers, weights) {
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

    // Draw nodes
    layers.forEach((layerSize, layerIndex) => {
        const x = layerSpacing * (layerIndex + 1);
        const ySpacing = height / (layerSize + 1);

        for (let i = 0; i < layerSize; i++) {
            const y = ySpacing * (i + 1);

            const node = svg.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", nodeRadius)
            .style("fill", "rgba(255, 255, 255, 0.1)") // Make the entire circle clickable
            .style("stroke", "white")
            .style("stroke-width", "2")
            .call(d3.drag()
                .on("start", dragStarted)
                .on("drag", dragged)
                .on("end", dragEnded)
            );

            nodes.push({ layerIndex, i, x, y, node });
        }
    });

    // Draw connections
    nodes.forEach(sourceNode => {
        if (sourceNode.layerIndex > 0) {
            const prevLayerNodes = nodes.filter(node => node.layerIndex === sourceNode.layerIndex - 1);

            prevLayerNodes.forEach((targetNode, j) => {
                const weight = weights && weights[`hidden_weights`] && weights[`hidden_weights`][j] ? weights[`hidden_weights`][j][sourceNode.i] : 0.5;

                const line = svg.append("line")
                    .attr("x1", targetNode.x)
                    .attr("y1", targetNode.y)
                    .attr("x2", sourceNode.x)
                    .attr("y2", sourceNode.y)
                    .attr("stroke", "#ccc")
                    .attr("stroke-width", 2)
                    .attr("class", `line-${sourceNode.layerIndex}-${sourceNode.i}-${targetNode.i}`) // Unique class for each connection
                    .on("mouseover", function () {
                        d3.select(this).attr("stroke", "blue").attr("stroke-width", 4); 

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

// Animation logic for forward and backward passes
export function animateDataFlow(data) {
    const svg = d3.select("svg");

    data.forEach((epochData, epochIndex) => {
        setTimeout(() => {
            if (stopTraining) return;

            const forwardDuration = epochData.forward_data.forward_time * 30000;
            const backwardDuration = epochData.backward_data.backward_time * 30000;

            animateForwardPass(epochData.forward_data, svg, forwardDuration);
            setTimeout(() => {
                animateBackwardPass(epochData.backward_data, svg, backwardDuration);
            }, forwardDuration + 500);
            updateLossChart(epochData.epoch, epochData.loss);

        }, epochIndex * 1000);
    });
}

export function animateForwardPass(forwardData, svg, duration) {
    forwardData.input.forEach((input, index) => {
        const inputNode = nodes.find(node => node.layerIndex === 0 && node.i === index);
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

// Animate the forward or backward pass through each layer
export function animateLightThroughLayer(node, nextLayerData, duration, svg, direction) {
    const nextLayerNodes = nodes.filter(n => n.layerIndex === node.layerIndex + 1);

    nextLayerNodes.forEach((targetNode, i) => {
        const light = svg.append("circle")
            .attr("cx", node.x)
            .attr("cy", node.y)
            .attr("r", 5)
            .style("fill", "yellow")
            .style("opacity", 1);

        light.transition()
            .duration(duration)
            .attr("cx", targetNode.x)
            .attr("cy", targetNode.y)
            .ease(d3.easeLinear)
            .on("end", function() {
                d3.select(this).remove();
                if (direction === "forward" && node.layerIndex < nodes.length - 1) {
                    animateLightThroughLayer(targetNode, nextLayerData, duration, svg, "forward");
                }
            });
    });
}

// // Function to clear the neural network visualization
export function clearNetwork() {
    d3.select("#visualization").html(""); // Clear the SVG area
}