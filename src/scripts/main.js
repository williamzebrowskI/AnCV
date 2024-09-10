import { drawNeuralNetwork } from './network-visualization.js';

let hiddenLayers = {1:4, 2:2};

const controls = document.getElementById('controls');
const inputNodesElement = document.getElementById('inputNodes');
const outputNodesElement = document.getElementById('outputNodes');
const hiddenLayersContainer = document.getElementById('hiddenLayersContainer');
const addHiddenLayerBtn = document.getElementById('addHiddenLayerBtn');
const removeHiddenLayerBtn = document.getElementById('removeHiddenLayerBtn');
const frameworkSelect = document.getElementById('frameworkSelect');

function updateNetworkVisualization() {
    const inputNodes = parseInt(inputNodesElement.value);
    const outputNodes = parseInt(outputNodesElement.value);
    const hiddenLayerSizes = Object.values(hiddenLayers);
    const layers = [inputNodes, ...hiddenLayerSizes, outputNodes];
    const selectedFramework = frameworkSelect.value;
    console.log('Network structure:', layers, 'Selected Framework:', selectedFramework);
    drawNeuralNetwork(layers, null);
}

function renderHiddenLayers() {
    hiddenLayersContainer.innerHTML = '';
    Object.entries(hiddenLayers).forEach(([index, size]) => {
        const layerDiv = document.createElement('div');
        layerDiv.innerHTML = `
            <label for="hiddenLayerSize${index}">Hidden Layer ${index} Size:</label>
            <div class="number-input">
                <button class="decrement">-</button>
                <input type="number" id="hiddenLayerSize${index}" value="${size}" min="1">
                <button class="increment">+</button>
            </div>
        `;
        hiddenLayersContainer.appendChild(layerDiv);
    });
}

function addHiddenLayer() {
    const newIndex = Object.keys(hiddenLayers).length + 1;
    hiddenLayers[newIndex] = 2;
    renderHiddenLayers();
    updateNetworkVisualization();
}

function removeHiddenLayer() {
    const lastIndex = Object.keys(hiddenLayers).length;
    if (lastIndex > 0) {
        delete hiddenLayers[lastIndex];
        renderHiddenLayers();
        updateNetworkVisualization();
    }
}

function handleNumberInputs(event) {
    const target = event.target;

    if (target.classList.contains('decrement') || target.classList.contains('increment')) {
        const input = target.parentElement.querySelector('input');
        const value = parseInt(input.value);
        const min = parseInt(input.min);
        const step = parseFloat(input.step) || 1;

        if (target.classList.contains('decrement')) {
            input.value = Math.max(value - step, min);
        } else {
            input.value = value + step;
        }

        // Check if this is for the input nodes
        if (input.id === 'inputNodes') {
            inputNodesElement.value = parseInt(input.value);  // Update inputNodesElement value
        }
        // Handle hidden layers
        else if (input.id.startsWith('hiddenLayerSize')) {
            const index = input.id.replace('hiddenLayerSize', '');
            hiddenLayers[index] = parseInt(input.value);  // Update hiddenLayers object
        }

        input.dispatchEvent(new Event('input'));  // Trigger 'input' event
        updateNetworkVisualization();  // Ensure visualization is updated
    }
}


controls.addEventListener('click', handleNumberInputs);
addHiddenLayerBtn.addEventListener('click', addHiddenLayer);
removeHiddenLayerBtn.addEventListener('click', removeHiddenLayer);
inputNodesElement.addEventListener('input', updateNetworkVisualization);
outputNodesElement.addEventListener('input', updateNetworkVisualization);
frameworkSelect.addEventListener('change', updateNetworkVisualization);
hiddenLayersContainer.addEventListener('input', (event) => {
    if (event.target.type === 'number') {
        const index = event.target.id.replace('hiddenLayerSize', '');
        hiddenLayers[index] = parseInt(event.target.value);
        updateNetworkVisualization();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    renderHiddenLayers();
    updateNetworkVisualization();
});

window.getHiddenLayerSizes = () => Object.values(hiddenLayers);

document.addEventListener('resetHiddenLayers', () => {
    hiddenLayers = {1: 4, 2: 2};
    renderHiddenLayers();
    updateNetworkVisualization();
});

document.addEventListener('getHiddenLayerSizes', () => {
    document.dispatchEvent(new CustomEvent('hiddenLayerSizesResult', { detail: Object.values(hiddenLayers) }));
});