from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from nn import SimpleNeuralNetwork, generate_dummy_data
import torch

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://127.0.0.1:5500"}})
socketio = SocketIO(app, cors_allowed_origins=["http://127.0.0.1:5500"])



def reset_network_state():
    global nn
    input_size = 5
    hidden_size = 4
    output_size = 1
    nn = SimpleNeuralNetwork(input_size, hidden_size, output_size)
    return {"message": "Neural network has been reset to initial state."}

@app.route('/reset', methods=['POST'])
def reset_network():
    return jsonify(reset_network_state())

@app.route('/train', methods=['POST'])
def train():
    data = request.json
    input_size = data['inputNodes']
    hidden_size = data['hiddenLayers'][0]
    output_size = data['outputNodes']
    epochs = data['epochs']
    learning_rate = data['learningRate']
    num_data_points = data['numDataPoints']
    noise_level = data['noiseLevel']
    batch_size = data.get('batchSize', 1) 

    training_data = generate_dummy_data(num_data_points, input_size, output_size, noise_level, batch_size)
    nn = SimpleNeuralNetwork(input_size, hidden_size, output_size)

    def training_callback(epoch, forward_data, backward_data, weights_biases_data, loss):

        socketio.emit('training_update', {
            'epoch': epoch,
            'forward_data': forward_data,
            'backward_data': backward_data,
            'weights_biases_data': weights_biases_data,
            'loss': loss
        })

    nn.train_network(training_data, epochs, learning_rate, callback=training_callback)

    return jsonify({"message": "Training started. Check WebSocket for updates."})

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('stop_training')
def handle_stop_training():
    reset_network_state()
    print('Training stop requested by the client')

if __name__ == '__main__':
    socketio.run(app, debug=True)