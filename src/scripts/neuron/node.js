import {handleNeuronMouseover, handleNeuronMouseleave, updateNeuronPopup, hideNeuronPopup } from './neuron-info.js'
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
        updateNeuronPopup(this.popup, event.sourceEvent.pageX, event.sourceEvent.pageY, {
            layerType: this.layerType,
            nodeIndex: this.nodeIndex,
            weight: this.weight || 'N/A',
            bias: this.bias || 'N/A',
            activation: this.activation || 'N/A',
            gradient: this.gradient || 'N/A',
            backpropHistory: []
        });
        this.popup.style("display", "block");
    }
}

export class InputNode extends Node {
    constructor(x, y, radius, svg, nodeIndex, popup, popupGroup) {
        super(x, y, radius, svg, 0, nodeIndex, popup, popupGroup); 
    }

    updateData(data) {
        const inputValue = data.inputValue != null ? data.inputValue.toFixed(4) : 'N/A';
        this.node.on("mouseenter", event => {
            handleNeuronMouseover(this.popupGroup, this.popup, event, "Input", this.nodeIndex, { inputValue });
        });
        this.node.on("mouseleave", event => {
            handleNeuronMouseleave(this.popup, event);
        });
    }
}

export class HiddenNode extends Node {
    constructor(x, y, radius, svg, layerIndex, nodeIndex, popup, popupGroup) {
        super(x, y, radius, svg, layerIndex, nodeIndex, popup, popupGroup);
    }

    updateData(data) {
        const popupData = this.formatNodeData(data);
        console.log("Hidden Node Data:", popupData);
        this.setupMouseEvents("Hidden", popupData);
    }

    formatNodeData(data) {
        const formatValue = value => {
            if (typeof value === 'number') return value.toFixed(4);
            if (Array.isArray(value)) return value;
            return value != null ? String(value) : 'N/A';
        };

        return {
            activation: formatValue(data.activation),
            preActivation: formatValue(data.preActivation),
            weight: formatValue(data.weight),
            bias: formatValue(data.bias),
            gradient: formatValue(data.gradient),
            layerIndex: this.layerType,
            nodeIndex: this.nodeIndex
        };
    }

    setupMouseEvents(nodeType, popupData) {
        this.node.on("mouseenter", event => {
            handleNeuronMouseover(this.popupGroup, this.popup, event, nodeType, this.nodeIndex, popupData);
        });
        this.node.on("mouseleave", event => {
            handleNeuronMouseleave(this.popup, event);
        });
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
        const formatValue = value => {
            if (typeof value === 'number') return value.toFixed(4);
            if (Array.isArray(value)) return value;
            return value != null ? String(value) : 'N/A';
        };

        return {
            outputValue: formatValue(data.outputValue),
            activation: formatValue(data.activation),
            preActivation: formatValue(data.preActivation),
            weight: formatValue(data.weight),
            bias: formatValue(data.bias),
            gradient: formatValue(data.gradient),
            error: formatValue(data.error),
            nodeIndex: this.nodeIndex
        };
    }

    setupMouseEvents(nodeType, popupData) {
        this.node.on("mouseenter", event => {
            handleNeuronMouseover(this.popupGroup, this.popup, event, nodeType, this.nodeIndex, popupData);
        });
        this.node.on("mouseleave", event => {
            handleNeuronMouseleave(this.popup, event);
        });
    }
}