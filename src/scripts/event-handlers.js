import * as networkVisualization from './network-visualization.js';
import { updateLossChart, resetLossChart, handleExpandLossDisplay } from './chart-logic.js';

export let stopTraining = false;

document.addEventListener('DOMContentLoaded', function() {
    // Set default values for the neural network
    const inputNodes = parseInt(document.getElementById('inputNodes').value);
    const hiddenLayers = document.getElementById('hiddenLayers').value.split(',').map(Number);
    const outputNodes = parseInt(document.getElementById('outputNodes').value);
    
    const layers = [inputNodes, ...hiddenLayers, outputNodes];

    // Optionally, set default weights for visualization or pass null/undefined to generate dummy weights
    const defaultWeights = null; // Or pass some dummy weights if available

    // Draw the neural network diagram on page load
    networkVisualization.drawNeuralNetwork(layers, defaultWeights);
});

document.getElementById('trainNetworkBtn').addEventListener('click', function () {
    stopTraining = false;
    const epochs = parseInt(document.getElementById('epochs').value);
    const learningRate = parseFloat(document.getElementById('learningRate').value);
    const numDataPoints = parseInt(document.getElementById('numDataPoints').value);
    const noiseLevel = parseFloat(document.getElementById('noiseLevel').value);

    fetch('http://127.0.0.1:5000/train', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputNodes: parseInt(document.getElementById('inputNodes').value),
            hiddenLayers: document.getElementById('hiddenLayers').value.split(',').map(Number),
            outputNodes: parseInt(document.getElementById('outputNodes').value),
            epochs: epochs,
            learningRate: learningRate,
            numDataPoints: numDataPoints,
            noiseLevel: noiseLevel
        })
    })
    .then(response => response.json())
    .then(data => {
        const weights = data[data.length - 1].weights_biases_data;
        const layers = [parseInt(document.getElementById('inputNodes').value), 
                        ...document.getElementById('hiddenLayers').value.split(',').map(Number), 
                        parseInt(document.getElementById('outputNodes').value)];
        networkVisualization.drawNeuralNetwork(layers, weights);
        networkVisualization.animateDataFlow(data);
    })
    .catch(error => console.error('Error:', error));
});

// Button event to load network on demand
document.getElementById('loadNetworkBtn').addEventListener('click', function () {
    const inputNodes = parseInt(document.getElementById('inputNodes').value);
    const hiddenLayers = document.getElementById('hiddenLayers').value.split(',').map(Number);
    const outputNodes = parseInt(document.getElementById('outputNodes').value);

    const layers = [inputNodes, ...hiddenLayers, outputNodes];

    // Call the draw function without dummy weights (weights should come from the backend after training)
    networkVisualization.drawNeuralNetwork(layers); // Pass null or replace with actual weights
});

document.getElementById('stopTrainingBtn').addEventListener('click', function () {
    stopTraining = true;
});

// Event listener for "Reset All" button
document.getElementById('resetAllBtn').addEventListener('click', function () {
    // Reset input fields to default values
    document.getElementById('inputNodes').value = 2;
    document.getElementById('hiddenLayers').value = '3,2';
    document.getElementById('outputNodes').value = 1;
    document.getElementById('epochs').value = 1000;
    document.getElementById('learningRate').value = 0.0001;
    document.getElementById('numDataPoints').value = 100;
    document.getElementById('noiseLevel').value = 0.1;

    // Clear the neural network visualization
    networkVisualization.clearNetwork();

    // Reset the loss chart
    resetLossChart();

    // Redraw the neural network with default parameters
    const defaultInputNodes = 2;
    const defaultHiddenLayers = [3, 2]; // Default hidden layers
    const defaultOutputNodes = 1;

    const layers = [defaultInputNodes, ...defaultHiddenLayers, defaultOutputNodes];

    networkVisualization.drawNeuralNetwork(layers); // Redraw the network with default values
});
// Call the expand logic for the loss display
handleExpandLossDisplay();