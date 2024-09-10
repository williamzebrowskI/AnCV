import {handleNeuronMouseover,handleNeuronMouseleave, updateNeuronPopup, hideNeuronPopup } from './neuron-info.js'
import { updateConnections } from '../network-visualization.js';

let isOverPopup = false; 

class Node {
    constructor(x, y, radius, svg, layerType, nodeIndex, popup, popupGroup) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.layerType = layerType;
        this.nodeIndex = nodeIndex;
        this.popup = popup;
        this.popupGroup = popupGroup; // Store popup and popupGroup in instance

        // Create the circle element and save it in `this.node`
        this.node = svg.append("circle")
            .attr("cx", this.x)
            .attr("cy", this.y)
            .attr("r", this.radius)
            .style("fill", "rgba(255, 255, 255, 0.1)")
            .style("stroke", "rgba(0, 255, 255, 1)")  // Neon blue stroke
            .style("stroke-width", "4px")
            .style("filter", "drop-shadow(0 0 15px rgba(0, 100, 255, 1))");

        this.layerIndex = layerType;  // Assign layerIndex
        this.i = nodeIndex;  // Assign nodeIndex

        // Add drag functionality using arrow functions to bind the correct context for `this`
        this.node.call(d3.drag()
            .on("start", (event) => this.dragStarted(event))
            .on("drag", (event) => this.dragged(event))
            .on("end", (event) => this.dragEnded(event))
        );
    }

    // Base update method (can be overridden)
    updateData(data) {
        console.log("Updating base node data", data);

        updateNeuronPopup(this.popup, this.x, this.y, data); 
    }

    dragStarted(event) {
        d3.select(this.node.node()).raise().attr("stroke", "black");
    
        // Show the popup with the relevant data
        updateNeuronPopup(this.popup, event.sourceEvent.pageX, event.sourceEvent.pageY, {
            layerType: this.layerType,
            nodeIndex: this.nodeIndex,
            weight: this.weight || 'N/A',
            bias: this.bias || 'N/A',
            activation: this.activation || 'N/A',
            gradient: this.gradient || 'N/A',
            backpropHistory: []  // Add backprop data if available
        });
    
        this.popup.style("display", "block");
    }

    dragged(event) {
        // Update the position of the node as it's dragged
        this.x = event.x;
        this.y = event.y;

        // Move the node visually
        d3.select(this.node.node())
            .attr("cx", this.x)
            .attr("cy", this.y);

        // Update the popup position
        updateNeuronPopup(this.popup, event.sourceEvent.pageX, event.sourceEvent.pageY, {
            layerType: this.layerType,
            nodeIndex: this.nodeIndex,
            weight: 'N/A',
            bias: 'N/A',
            activation: 'N/A',
            gradient: 'N/A',
            backpropHistory: []
        });

        // Update any connections to this node
        updateConnections(this);
    }

    dragEnded(event) {
        // Reset stroke style when drag ends
        d3.select(this.node.node()).attr("stroke", "rgba(0, 255, 255, 1)");

        // Hide the popup if not over it
        if (!isOverPopup) {
            hideNeuronPopup(this.popup);
        }
    }
}


export class InputNode extends Node {
    constructor(x, y, radius, svg, nodeIndex, popup, popupGroup) {
        super(x, y, radius, svg, 0, nodeIndex, popup, popupGroup); 
    }

    updateData(data) {
        const inputValue = data.inputValue ? data.inputValue.toFixed(4) : 'N/A';

        this.node.on("mouseenter", (event) => {
            handleNeuronMouseover(this.popupGroup, this.popup, event, "Input", this.nodeIndex, { inputValue });
        });

        this.node.on("mouseleave", (event) => {
            handleNeuronMouseleave(this.popup, event);
        });
    }
}

export class HiddenNode extends Node {
    constructor(x, y, radius, svg, layerIndex, nodeIndex, popup, popupGroup) {
        super(x, y, radius, svg, layerIndex, nodeIndex, popup, popupGroup); // Pass popup and popupGroup
    }

    updateData(data) {
        // Ensure to print any value regardless of data type
        const activation = typeof data.activation !== 'undefined' 
            ? (typeof data.activation === 'number' ? data.activation.toFixed(4) : String(data.activation)) 
            : 'N/A';

        const preActivation = typeof data.preActivation !== 'undefined' 
            ? (typeof data.preActivation === 'number' ? data.preActivation.toFixed(4) : String(data.preActivation)) 
            : 'N/A';

        // Debugging both activation and preActivation values before passing to handleNeuronMouseover
        console.log("updateData - Activation (any type):", activation);
        console.log("updateData - Pre-Activation (any type):", preActivation);

        // Mouse event handling
        this.node.on("mouseenter", (event) => {
            console.log("updateData - Before calling handleNeuronMouseover");
            handleNeuronMouseover(this.popupGroup, this.popup, event, "Hidden", this.nodeIndex, { activation, preActivation });
        });

        this.node.on("mouseleave", (event) => {
            handleNeuronMouseleave(this.popup, event);
        });
    }
}

export class OutputNode extends Node {
    constructor(x, y, radius, svg, nodeIndex, totalLayers, popup, popupGroup) {
        super(x, y, radius, svg, totalLayers - 1, nodeIndex, popup, popupGroup);
    }

    updateData(data) {
        const outputValue = data.outputValue ? data.outputValue.toFixed(4) : 'N/A';

        this.node.on("mouseenter", (event) => {
            handleNeuronMouseover(this.popupGroup, this.popup, event, "Output", this.nodeIndex, { outputValue });
        });

        this.node.on("mouseleave", (event) => {
            handleNeuronMouseleave(this.popup, event);
        });
    }
}