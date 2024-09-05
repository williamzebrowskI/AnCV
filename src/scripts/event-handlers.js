import * as networkVisualization from './network-visualization.js';
import { updateLossChart, resetLossChart, handleExpandLossDisplay } from './chart-logic.js';

export let stopTraining = false;

// Create the WebSocket connection to the server
var socket = io.connect('http://127.0.0.1:5000');

// Handle WebSocket connection established
socket.on('connect', function() {
    console.log("WebSocket connection established");
});

// Handle WebSocket disconnection
socket.on('disconnect', function() {
    console.log("Disconnected from WebSocket server");
});

// Listen for real-time training updates via WebSocket
socket.on('training_update', function(data) {
    if (stopTraining) return;  // Stop updating the UI if training has stopped

    console.log('Training update received:', data);

    // Update the UI with training data (e.g., updating a loss chart)
    updateLossChart(data.epoch, data.loss);  // Assuming this function exists to update the loss chart

    const layers = [
        parseInt(document.getElementById('inputNodes').value),
        ...document.getElementById('hiddenLayers').value.split(',').map(Number),
        parseInt(document.getElementById('outputNodes').value)
    ];

    // Update the neural network visualization with the new weights/biases
    networkVisualization.drawNeuralNetwork(layers, data.weights_biases_data);

    // Optionally, animate the forward and backward pass using the data
    networkVisualization.animateDataFlow(data);
});

// Handle document load event to set initial visualization
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

// Start training when the user clicks the "Train" button
document.getElementById('trainNetworkBtn').addEventListener('click', function () {
    stopTraining = false;  // Reset stop flag
    const epochs = parseInt(document.getElementById('epochs').value);
    const learningRate = parseFloat(document.getElementById('learningRate').value);
    const numDataPoints = parseInt(document.getElementById('numDataPoints').value);
    const noiseLevel = parseFloat(document.getElementById('noiseLevel').value);
    const batchSize = parseInt(document.getElementById('batchSize').value);

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
            noiseLevel: noiseLevel,
            batchSize: batchSize 
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Training completed:", data);
        const weights = data[data.length - 1].weights_biases_data;
        const layers = [
            parseInt(document.getElementById('inputNodes').value), 
            ...document.getElementById('hiddenLayers').value.split(',').map(Number), 
            parseInt(document.getElementById('outputNodes').value)
        ];
        // Draw final state of the neural network
        networkVisualization.drawNeuralNetwork(layers, weights);
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

// Stop training when the "Stop" button is clicked
document.getElementById('stopTrainingBtn').addEventListener('click', function () {
    stopTraining = true;  // Stop updating the frontend
    socket.emit('stop_training');  // Emit event to the backend to stop training
});

// Reset all values and the network when the "Reset" button is clicked
document.getElementById('resetAllBtn').addEventListener('click', function () {
    // Reset input fields to default values
    document.getElementById('inputNodes').value = 5;
    document.getElementById('hiddenLayers').value = '4,3';
    document.getElementById('outputNodes').value = 1;
    document.getElementById('epochs').value = 100;
    document.getElementById('learningRate').value = 0.001;
    document.getElementById('numDataPoints').value = 100;
    document.getElementById('noiseLevel').value = 0.1;

    // Reset the loss chart
    resetLossChart();

    stopTraining = true;

    // Clear the network visualization and its state
    networkVisualization.clearNetwork();

    // Redraw the neural network with default parameters
    const defaultInputNodes = 5;
    const defaultHiddenLayers = [4, 3];
    const defaultOutputNodes = 1;
    const layers = [defaultInputNodes, ...defaultHiddenLayers, defaultOutputNodes];

    networkVisualization.drawNeuralNetwork(layers); // Redraw the network

    // Make a call to reset the backend neural network state
    fetch('http://127.0.0.1:5000/reset', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);  // Confirmation that the network has been reset
    })
    .catch(error => console.error('Error resetting network:', error));
});

// Handle expanding logic for the loss display
handleExpandLossDisplay();