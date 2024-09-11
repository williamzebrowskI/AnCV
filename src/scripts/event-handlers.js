// event-handler.js

import * as networkVisualization from './network-visualization.js';
import { updateLossChart, resetLossChart, handleExpandLossDisplay } from './chart-logic.js';
import { drawNeuralNetwork, updateNodesWithData, animateDataFlow } from './network-visualization.js'; 

let hiddenLayersContainer = document.getElementById('hiddenLayersContainer');
let hiddenLayerCount = 0;
export let stopTraining = false;

const socket = io.connect('http://127.0.0.1:5000');

['connect', 'disconnect'].forEach(event => {
    socket.on(event, () => console.log(`${event === 'connect' ? 'WebSocket connection established' : 'Disconnected from WebSocket server'}`));
});

let isNetworkInitialized = false;

socket.on('training_update', data => {
    if (stopTraining) return;

    const inputSize = data.input_size;
    const hiddenLayerSizes = window.getHiddenLayerSizes();
    const outputNodes = parseInt(document.getElementById('outputNodes').value);
    const layers = [inputSize, ...hiddenLayerSizes, outputNodes];

    if (!isNetworkInitialized) {
        drawNeuralNetwork(layers, data.weights_biases_data, data);
        isNetworkInitialized = true;
    } else {
        updateNodesWithData(data, layers);
    }
    animateDataFlow(data);
});

const redrawNetwork = () => {
    const inputNodes = parseInt(document.getElementById('inputNodes').value);
    const outputNodes = parseInt(document.getElementById('outputNodes').value);
    const hiddenLayers = Array.from({length: hiddenLayerCount}, (_, i) => parseInt(document.getElementById(`hiddenLayerSize${i+1}`).value));
    const layers = [inputNodes, ...hiddenLayers, outputNodes];
    
    drawNeuralNetwork(layers, null);
    isNetworkInitialized = true;
};

document.addEventListener('DOMContentLoaded', () => {
    redrawNetwork();
});

const handleTraining = (start) => {
    stopTraining = !start;
    const trainBtn = document.getElementById('trainNetworkBtn');
    trainBtn.disabled = start;
    trainBtn.classList.toggle('disabled-btn', start);

    if (start) {
        const trainingData = {
            inputNodes: parseInt(document.getElementById('inputNodes').value),
            hiddenLayers: window.getHiddenLayerSizes(),
            outputNodes: parseInt(document.getElementById('outputNodes').value),
            epochs: parseInt(document.getElementById('epochs').value),
            learningRate: parseFloat(document.getElementById('learningRate').value),
            numDataPoints: parseInt(document.getElementById('numDataPoints').value),
            noiseLevel: parseFloat(document.getElementById('noiseLevel').value),
            batchSize: parseInt(document.getElementById('batchSize').value)
        };
        socket.emit('start_training', trainingData);
    } else {
        socket.emit('stop_training');
    }
};

document.getElementById('trainNetworkBtn').addEventListener('click', () => handleTraining(true));
document.getElementById('stopTrainingBtn').addEventListener('click', () => handleTraining(false));

['training_started', 'training_stopped', 'training_completed', 'training_error'].forEach(event => {
    socket.on(event, data => {
        console.log(`${event}:`, data?.message || '');
        if (event !== 'training_started') {
            document.getElementById('trainNetworkBtn').disabled = false;
            document.getElementById('trainNetworkBtn').classList.remove('disabled-btn');
        }
    });
});

document.getElementById('loadNetworkBtn').addEventListener('click', () => {
    const inputNodes = parseInt(document.getElementById('inputNodes').value);
    const hiddenLayers = document.getElementById('hiddenLayers').value.split(',').map(Number);
    const outputNodes = parseInt(document.getElementById('outputNodes').value);
    networkVisualization.drawNeuralNetwork([inputNodes, ...hiddenLayers, outputNodes]);
    isNetworkInitialized = true;
});

document.getElementById('inputNodes').addEventListener('input', redrawNetwork);

document.getElementById('resetAllBtn').addEventListener('click', () => {
    ['inputNodes', 'outputNodes', 'epochs', 'learningRate', 'numDataPoints', 'noiseLevel'].forEach(id => {
        document.getElementById(id).value = id === 'inputNodes' ? 4 : id === 'outputNodes' ? 1 : id === 'epochs' ? 100 : id === 'learningRate' ? 0.001 : id === 'numDataPoints' ? 100 : 0.1;
    });
    
    document.dispatchEvent(new Event('resetHiddenLayers'));
    resetLossChart();
    refreshMap();
    stopTraining = true;
    isNetworkInitialized = false;
    
    document.dispatchEvent(new Event('getHiddenLayerSizes'));
    document.addEventListener('hiddenLayerSizesResult', function handler(e) {
        networkVisualization.drawNeuralNetwork([4, ...e.detail, 1]);
        isNetworkInitialized = true;
        document.removeEventListener('hiddenLayerSizesResult', handler);
    });
    
    fetch('http://127.0.0.1:5000/reset', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            document.getElementById('trainNetworkBtn').disabled = false;
            document.getElementById('trainNetworkBtn').classList.remove('disabled-btn');
        })
        .catch(error => console.error('Error resetting network:', error));
});

handleExpandLossDisplay();