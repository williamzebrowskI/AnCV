// node.js

import {handleNeuronMouseover, handleNeuronMouseleave, updateNeuronPopup, hideNeuronPopup } from './neuron-info.js';
import { updateConnections, setCurrentHoveredNode, clearCurrentHoveredNode } from '../network-visualization.js';

let isOverPopup = false; 

class Node {
    constructor(x, y, radius, svg, layerType, nodeIndex, popup, popupGroup) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.layerType = layerType;
        this.nodeIndex = nodeIndex;
        this.popup = popup;
        this.popupGroup = popupGroup;

        this.node = svg.append("circle")
            .attr("cx", this.x)
            .attr("cy", this.y)
            .attr("r", this.radius)
            .style("fill", "rgba(255, 255, 255, 0.1)")
            .style("stroke", "rgba(0, 255, 255, 1)")
            .style("stroke-width", "4px")
            .style("filter", "drop-shadow(0 0 15px rgba(0, 100, 255, 1))");

        this.layerIndex = layerType;
        this.i = nodeIndex;

        // Add drag functionality using arrow functions to bind the correct context for `this`
        this.node.call(d3.drag()
            .on("start", event => this.dragStarted(event))
            .on("drag", event => this.dragged(event))
            .on("end", event => this.dragEnded(event))
        );
    }

    updateData(data) {
        console.log("Updating base node data", data);
        updateNeuronPopup(this.popup, this.x, this.y, data); 
    }

    dragStarted(event) {
        d3.select(this.node.node()).raise().attr("stroke", "black");
        this.updatePopupOnDrag(event);
    }

    dragged(event) {
        this.x = event.x;
        this.y = event.y;
        d3.select(this.node.node())
            .attr("cx", this.x)
            .attr("cy", this.y);
        this.updatePopupOnDrag(event);
        updateConnections(this);
    }

    dragEnded(event) {
        d3.select(this.node.node()).attr("stroke", "rgba(0, 255, 255, 1)");
        if (!isOverPopup) {
            hideNeuronPopup(this.popup);
        }
    }

    updatePopupOnDrag(event) {
        let nodeData = this.getNodeData();
        updateNeuronPopup(this.popup, event.sourceEvent.pageX, event.sourceEvent.pageY, nodeData);
        this.popup.style("display", "block");
    }

    getNodeData() {
        if (this.layerType === 0) {
            return {
                layerType: "Input",
                nodeIndex: this.nodeIndex,
                inputValue: this.inputValue || 'N/A'
            };
        } else {
            return {
                layerType: this.layerType === 1 ? "Hidden" : "Output",
                nodeIndex: this.nodeIndex,
                weight: this.weight || 'N/A',
                bias: this.bias || 'N/A',
                activation: this.activation || 'N/A',
                gradient: this.gradient || 'N/A',
                backpropHistory: []
            };
        }
    }

    formatValue(value) {
        if (typeof value === 'number') return value.toFixed(4);
        if (Array.isArray(value)) return value;
        return value != null ? String(value) : 'N/A';
    }

    setupMouseEvents(nodeType, popupData) {
        this.node.on("mouseenter", event => {
            setCurrentHoveredNode(this);
            handleNeuronMouseover(this.popupGroup, this.popup, event, nodeType, this.nodeIndex, popupData);
        });
        this.node.on("mouseleave", event => {
            clearCurrentHoveredNode();
            handleNeuronMouseleave(this.popup, event);
        });
    }
}

export class InputNode extends Node {
    constructor(x, y, radius, svg, nodeIndex, popup, popupGroup) {
        super(x, y, radius, svg, 0, nodeIndex, popup, popupGroup); 
    }

    updateData(data) {
        const inputValue = this.formatValue(data.inputValue);
        this.setupMouseEvents("Input", { inputValue });
    }
}

export class HiddenNode extends Node {
    constructor(x, y, radius, svg, layerIndex, nodeIndex, popup, popupGroup) {
        super(x, y, radius, svg, layerIndex, nodeIndex, popup, popupGroup);
    }

    updateData(data) {
        const popupData = this.formatNodeData(data);
        console.log("Hidden Node Data:", popupData);
        this.setupMouseEvents(`Hidden Layer ${this.layerIndex}`, popupData);
    }

    formatNodeData(data) {
        return {
            activation: this.formatValue(data.activation),
            preActivation: this.formatValue(data.preActivation),
            weight: this.formatValue(data.weight),
            bias: this.formatValue(data.bias),
            gradient: this.formatValue(data.gradient),
            layerIndex: this.layerType,
            nodeIndex: this.nodeIndex
        };
    }
}

export class OutputNode extends Node {
    constructor(x, y, radius, svg, nodeIndex, totalLayers, popup, popupGroup) {
        super(x, y, radius, svg, totalLayers - 1, nodeIndex, popup, popupGroup);
    }

    updateData(data) {
        const popupData = this.formatNodeData(data);
        console.log("Output Node Data:", popupData);
        this.setupMouseEvents("Output", popupData);
    }

    formatNodeData(data) {
        return {
            outputValue: this.formatValue(data.outputValue),
            activation: this.formatValue(data.activation),
            preActivation: this.formatValue(data.preActivation),
            weight: this.formatValue(data.weight),
            bias: this.formatValue(data.bias),
            gradient: this.formatValue(data.gradient),
            error: this.formatValue(data.error),
            nodeIndex: this.nodeIndex
        };
    }
}