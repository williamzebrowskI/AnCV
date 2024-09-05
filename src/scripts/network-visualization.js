import { updateLossChart } from "./chart-logic.js";
import { stopTraining } from './event-handlers.js';

let nodes = []; // Keep this global to track all nodes for connections
let links = []; // Global array to track connections/links between nodes
let selectedNodeIndex = null;  // Track the index of the selected node

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

    let selectedNode = null;  // Track the currently selected node
    let selectedNodeIndex = null;  // Track the index of the selected node

    nodes = []; // Clear the global nodes array before redrawing
    links = []; // Clear the global links array before redrawing

    // Create nodes
    layers.forEach((layerSize, layerIndex) => {
        const x = layerSpacing * (layerIndex + 1);
        const ySpacing = height / (layerSize + 1);

        for (let i = 0; i < layerSize; i++) {
            const y = ySpacing * (i + 1);

            let layerLabel;
            if (layerIndex === 0) {
                layerLabel = "Input";
            } else if (layerIndex === layers.length - 1) {
                layerLabel = "Output";
            } else {
                layerLabel = "Hidden";
            }

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
                
                    // Display a white box with details on hover
                    const boxWidth = 120;
                    const boxHeight = 50;
                    const boxX = parseFloat(d3.select(this).attr("cx")) - boxWidth / 2;
                    const boxY = parseFloat(d3.select(this).attr("cy")) - nodeRadius - boxHeight - 10;
                
                    // Append the group container for the box and text
                    const hoverGroup = svg.append("g")
                        .attr("class", "hover-box");
                
                    hoverGroup.append("rect")
                        .attr("x", boxX)
                        .attr("y", boxY)
                        .attr("width", boxWidth)
                        .attr("height", boxHeight)
                        .attr("fill", "white")
                        .attr("stroke", "rgba(255, 99, 132, 1)")
                        .attr("rx", 10)
                        .attr("ry", 10);
                
                    // Create the text label inside the box
                    hoverGroup.append("text")
                        .attr("x", boxX + boxWidth / 2)
                        .attr("y", boxY + 20)
                        .attr("fill", "black")
                        .attr("font-size", "14px")
                        .attr("text-anchor", "middle")
                        .attr("class", "hover-text")
                        .text(`${layerLabel} Layer`);
                
                    // Add another placeholder text for future details
                    hoverGroup.append("text")
                        .attr("x", boxX + boxWidth / 2)
                        .attr("y", boxY + 40)
                        .attr("fill", "gray")
                        .attr("font-size", "12px")
                        .attr("text-anchor", "middle")
                        .attr("class", "hover-text")
                        .text("Details...");
                })
                .on("mouseout", function () {
                    if (!d3.select(this).classed("selected")) {
                        d3.select(this).style("stroke", "white"); // Reset stroke color
                        d3.select(this).style("stroke-width", "2px"); // Reset to original stroke width
                        svg.selectAll(".hover-box").remove(); // Remove the hover group, including box and text
                    }
                })
                // .on("click", function () {
                //     const node = d3.select(this);

                //     if (node.classed("selected")) {
                //         // Deselect the node if clicked again
                //         node.style("stroke", "white")
                //             .style("stroke-width", "2px")
                //             .classed("selected", false);

                //         svg.selectAll(".layer-label").remove();
                //         selectedNodeIndex = null;  // Clear the selection
                //     } else {
                //         // Deselect previous node
                //         if (selectedNode) {
                //             selectedNode.style("stroke", "white")
                //                         .style("stroke-width", "2px")
                //                         .classed("selected", false);
                //         }

                //         // Select the new node
                //         node.style("stroke", "rgba(255, 99, 132, 1)")
                //             .style("stroke-width", "4px")
                //             .classed("selected", true);

                //         selectedNode = node;
                //         selectedNodeIndex = nodes.findIndex(n => n.node === node.node());  // Store the index

                //         // Display the "Layer" label for the selected node
                //         svg.selectAll(".layer-label").remove();
                //         svg.append("text")
                //             .attr("x", node.attr("cx"))
                //             .attr("y", node.attr("cy") - 25)
                //             .attr("fill", "white")
                //             .attr("font-size", "14px")
                //             .attr("class", "layer-label")
                //             .text(`${layerLabel} Layer`);
                //     }
                // });

            nodes.push({ layerIndex, i, x, y, node: node.node() });
        }
    });

    // Create links (lines between nodes)
    nodes.forEach(sourceNode => {
        if (sourceNode.layerIndex < layers.length - 1) {
            const nextLayerNodes = nodes.filter(node => node.layerIndex === sourceNode.layerIndex + 1);

            nextLayerNodes.forEach((targetNode, j) => {
                let weight;

                // Handle input-to-hidden weights
                if (sourceNode.layerIndex === 0) {
                    weight = weights && weights[`input_weights`] && weights[`input_weights`][j]
                        ? weights[`input_weights`][j][sourceNode.i]
                        : 0.5; // Default weight if undefined
                } else {
                    // Handle hidden-to-hidden or hidden-to-output weights
                    weight = weights && weights[`hidden_weights`] && weights[`hidden_weights`][j]
                        ? weights[`hidden_weights`][j][sourceNode.i]
                        : 0.5; // Default weight if undefined
                }

                const line = svg.append("line")
                    .attr("x1", sourceNode.x)
                    .attr("y1", sourceNode.y)
                    .attr("x2", targetNode.x)
                    .attr("y2", targetNode.y)
                    .attr("stroke", "#ccc")
                    .attr("stroke-width", 2)
                    .attr("class", `line-${sourceNode.layerIndex}-${sourceNode.i}-${targetNode.i}`)
                    .on("mouseover", function () {
                        // Highlight the line
                        d3.select(this).attr("stroke", "rgba(255, 99, 132, 1)").attr("stroke-width", 4);

                        // Display the weight in a tooltip
                        const tooltip = svg.append("text")
                            .attr("x", (sourceNode.x + targetNode.x) / 2)
                            .attr("y", (sourceNode.y + targetNode.y) / 2 - 10)
                            .attr("fill", "white")
                            .attr("font-size", "14px")
                            .attr("text-anchor", "middle")
                            .text(`Weight: ${(weight || 0).toFixed(4)}`); // Show the weight

                        // Handle mouseout event to reset the line and remove the tooltip
                        d3.select(this).on("mouseout", function () {
                            d3.select(this).attr("stroke", "#ccc").attr("stroke-width", 2);
                            tooltip.remove(); // Remove the tooltip on mouseout
                        });
                    });

                links.push({ source: sourceNode, target: targetNode, line, weight });
            });
        }
    });
}
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

// Animation for forward pass
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