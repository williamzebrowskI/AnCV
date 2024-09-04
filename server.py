from flask import Flask, request, jsonify
from flask_cors import CORS
from nn import SimpleNeuralNetwork, generate_dummy_data
import torch

app = Flask(__name__)
CORS(app)

def reset_network_state():
    # Reset the neural network state (re-initialize the neural network)
    global nn  # Assuming nn is your global neural network object
    input_size = 5  # You can use default values or pass these in the request
    hidden_size = 4  # Default value for hidden layers
    output_size = 1  # Default output size

    nn = SimpleNeuralNetwork(input_size, hidden_size, output_size)  # Re-instantiate the neural network

    return {"message": "Neural network has been reset to initial state."}

@app.route('/reset', methods=['POST'])
def reset_network():
    return jsonify(reset_network_state())

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
    noise_level = data['noiseLevel']  # Ensure this matches the key sent from frontend

    # Generate complex dummy data based on user input
    training_data = generate_dummy_data(num_data_points, input_size, output_size, noise_level)

    nn = SimpleNeuralNetwork(input_size, hidden_size, output_size)
    training_results = []

    def training_callback(epoch, forward_data, backward_data, weights_biases_data, loss):
        training_results.append({
            'epoch': epoch,
            'forward_data': forward_data,
            'backward_data': backward_data,
            'weights_biases_data': weights_biases_data,  # Include weights and biases
            'loss': loss  # Include the loss
        })

    nn.train_network(training_data, epochs, learning_rate, callback=training_callback)

    return jsonify(training_results)

if __name__ == '__main__':
    app.run(debug=True)