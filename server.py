from flask import Flask, request, jsonify
from flask_cors import CORS
from nn import SimpleNeuralNetwork
import torch

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

@app.route('/train', methods=['POST'])
def train():
    data = request.json
    input_size = data['inputNodes']
    hidden_size = data['hiddenLayers'][0]
    output_size = data['outputNodes']
    epochs = data['epochs']
    learning_rate = data['learningRate']  # Capture learning rate

    # Dummy data for training
    training_data = [
        (torch.tensor([0.5, 0.2, 0.1]), torch.tensor([0.7])),
        (torch.tensor([0.9, 0.1, 0.3]), torch.tensor([0.4])),
    ]

    nn = SimpleNeuralNetwork(input_size, hidden_size, output_size)
    training_results = []

    def training_callback(epoch, forward_data, backward_data, loss):
        training_results.append({
            'epoch': epoch,
            'forward_data': forward_data,
            'backward_data': backward_data,
            'loss': loss.item()  # Include the loss value
        })

    nn.train_network(training_data, epochs, learning_rate=learning_rate, callback=training_callback)

    return jsonify(training_results)

if __name__ == '__main__':
    app.run(debug=True)