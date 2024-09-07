import * as networkVisualization from './network-visualization.js';
import { updateLossChart, resetLossChart, handleExpandLossDisplay } from './chart-logic.js';
import { drawNeuralNetwork } from './network-visualization.js'; 

let hiddenLayersContainer = document.getElementById('hiddenLayersContainer');
let hiddenLayerCount = 0;
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

if (!socket.hasListeners('training_update')) {
    socket.on('training_update', function(data) {
        if (stopTraining) return;  // Stop updating the UI if training has stopped
        
        const inputSize = data.input_size;
        
        // Get hidden layer sizes using the global function
        const hiddenLayerSizes = window.getHiddenLayerSizes();
        
        // Get output nodes from the form
        const outputNodes = parseInt(document.getElementById('outputNodes').value);
        
        // Construct the layers array
        const layers = [inputSize, ...hiddenLayerSizes, outputNodes];
        
        // Draw the updated network
        networkVisualization.drawNeuralNetwork(layers, data.weights_biases_data);
        
        // Optionally animate forward and backward passes
        networkVisualization.animateDataFlow(data);
    });
}

function redrawNetwork() {
    let inputNodes = parseInt(document.getElementById('inputNodes').value);
    let outputNodes = parseInt(document.getElementById('outputNodes').value);
    let hiddenLayers = [];

    for (let i = 1; i <= hiddenLayerCount; i++) {
        let hiddenLayerSize = parseInt(document.getElementById(`hiddenLayerSize${i}`).value);
        hiddenLayers.push(hiddenLayerSize);
    }

    const layers = [inputNodes, ...hiddenLayers, outputNodes];
    
    // Call the drawNeuralNetwork function to redraw the network with updated layers
    drawNeuralNetwork(layers, null);  // 'null' for weights if not available
}

// Optionally, you can call redrawNetwork() initially to draw the network at the start
document.addEventListener('DOMContentLoaded', function() {
    redrawNetwork();  // Draw the network with default values when the page loads
});

// Handle document load event to set initial visualization
document.addEventListener('DOMContentLoaded', function() {
    // Set default values for the neural network
    const inputNodes = parseInt(document.getElementById('inputNodes').value);
    const hiddenLayers = [];
        document.querySelectorAll('#hiddenLayersContainer input').forEach(input => {
            hiddenLayers.push(parseInt(input.value));
    });
    const outputNodes = parseInt(document.getElementById('outputNodes').value);
    
    const layers = [inputNodes, ...hiddenLayers, outputNodes];

    // Optionally, set default weights for visualization or pass null/undefined to generate dummy weights
    const defaultWeights = null; // Or pass some dummy weights if available

    // Draw the neural network diagram on page load
    networkVisualization.drawNeuralNetwork(layers, defaultWeights);
});

document.getElementById('trainNetworkBtn').addEventListener('click', function () {
    stopTraining = false;  // Reset stop flag
    const trainBtn = document.getElementById('trainNetworkBtn');
    trainBtn.disabled = true;  // Disable the button
    trainBtn.classList.add('disabled-btn');  // Add the class for visual effect
    
    const epochs = parseInt(document.getElementById('epochs').value);
    const learningRate = parseFloat(document.getElementById('learningRate').value);
    const numDataPoints = parseInt(document.getElementById('numDataPoints').value);
    const noiseLevel = parseFloat(document.getElementById('noiseLevel').value);
    const batchSize = parseInt(document.getElementById('batchSize').value);
    
    // Get hidden layer sizes using the global function
    const hiddenLayerSizes = window.getHiddenLayerSizes();

    console.log(hiddenLayerSizes)

    const trainingData = {
        inputNodes: parseInt(document.getElementById('inputNodes').value),
        hiddenLayers: hiddenLayerSizes,
        outputNodes: parseInt(document.getElementById('outputNodes').value),
        epochs: epochs,
        learningRate: learningRate,
        numDataPoints: numDataPoints,
        noiseLevel: noiseLevel,
        batchSize: batchSize
    };

    console.log('Emitting start_training event with the following data:', trainingData);
    socket.emit('start_training', trainingData);

    // Listen for the response when training starts
    socket.on('training_started', function(data) {
        console.log('Training started:', data.message);
    });

    // Re-enable the "Train" button after training is completed (or in the stop handler)
    socket.on('training_completed', function() {
        trainBtn.disabled = false;
        trainBtn.classList.remove('disabled-btn');
        console.log('Training completed.');
    });

    // Handle errors or stop signal
    socket.on('training_error', function(error) {
        console.error('Training error:', error);
        trainBtn.disabled = false;
        trainBtn.classList.remove('disabled-btn');
    });
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
    socket.emit('stop_training'); 

    const trainBtn = document.getElementById('trainNetworkBtn');
    trainBtn.disabled = false;
    trainBtn.classList.remove('disabled-btn');
});

socket.on('training_stopped', function(data) {
    console.log(data.message); 
});



document.getElementById('inputNodes').addEventListener('input', function() {
    const inputNodes = parseInt(document.getElementById('inputNodes').value);
    const hiddenLayers = document.getElementById('hiddenLayers').value.split(',').map(Number);
    const outputNodes = parseInt(document.getElementById('outputNodes').value);

    const layers = [inputNodes, ...hiddenLayers, outputNodes];

    // Automatically redraw the network every time input value changes
    networkVisualization.drawNeuralNetwork(layers); // Draw network without needing to press the button
});

// Reset all values and the network when the "Reset" button is clicked
document.getElementById('resetAllBtn').addEventListener('click', function () {
    document.getElementById('inputNodes').value = 4;
    document.getElementById('hiddenLayers').value = '3,2';
    document.getElementById('outputNodes').value = 1;
    document.getElementById('epochs').value = 100;
    document.getElementById('learningRate').value = 0.001;
    document.getElementById('numDataPoints').value = 100;
    document.getElementById('noiseLevel').value = 0.1;

    resetLossChart();
    refreshMap()

    stopTraining = true;

    networkVisualization.clearNetwork();

    const defaultInputNodes = 4;
    const defaultHiddenLayers = [3, 2];
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

        // Enable the "Train" button after reset
        const trainBtn = document.getElementById('trainNetworkBtn');
        trainBtn.disabled = false;
        trainBtn.classList.remove('disabled-btn');
    })
    .catch(error => console.error('Error resetting network:', error));
});


// Handle expanding logic for the loss display
handleExpandLossDisplay();