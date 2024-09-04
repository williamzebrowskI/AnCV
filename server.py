from flask import Flask, request, jsonify
from flask_cors import CORS
from nn import SimpleNeuralNetwork, generate_dummy_data
import torch

app = Flask(__name__)
CORS(app)

@app.route('/train', methods=['POST'])
def train():
    data = request.json
    input_size = data['inputNodes']
    hidden_size = data['hiddenLayers'][0]  # Simplified to one hidden layer
    output_size = data['outputNodes']
    epochs = data['epochs']
    learning_rate = data['learningRate']

    # Extract the data complexity settings from the request
    num_data_points = data['numDataPoints']  # Ensure this matches the key sent from frontend
    input_features = data['inputFeatures']  # Ensure this matches the key sent from frontend
    noise_level = data['noiseLevel']  # Ensure this matches the key sent from frontend

    # Generate complex dummy data based on user input
    training_data = generate_dummy_data(num_data_points, input_features, output_size, noise_level)

    nn = SimpleNeuralNetwork(input_size, hidden_size, output_size)
    training_results = []

    def training_callback(epoch, forward_data, backward_data, loss):
        training_results.append({
            'epoch': epoch,
            'forward_data': forward_data,
            'backward_data': backward_data,
            'loss': loss  # Include the loss
        })

    nn.train_network(training_data, epochs, learning_rate, callback=training_callback)

    return jsonify(training_results)

if __name__ == '__main__':
    app.run(debug=True)