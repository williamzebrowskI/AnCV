from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from nn import SimpleNeuralNetwork, generate_dummy_data
from threading import Thread
import ctypes
import numpy as np

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://127.0.0.1:5500"}})
socketio = SocketIO(app, cors_allowed_origins=["http://127.0.0.1:5500"])

training_thread = None

# Function to raise an exception in a thread
def raise_exception_in_thread(thread, exc_type):
    """Helper function to raise an exception in a running thread."""
    if not thread.is_alive():
        return
    thread_id = ctypes.pythonapi.PyThreadState_SetAsyncExc(
        ctypes.c_long(thread.ident), ctypes.py_object(exc_type)
    )
    if thread_id == 0:
        raise ValueError("Nonexistent thread id")
    elif thread_id > 1:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(thread.ident, None)
        raise SystemError("Exception raise failure")

def reset_network_state():
    global nn
    input_size = 5
    hidden_sizes = [3, 2]  # Default hidden layers
    output_size = 1
    nn = SimpleNeuralNetwork(input_size, hidden_sizes, output_size)
    return {"message": "Neural network has been reset to initial state."}

@app.route('/reset', methods=['POST'])
def reset_network():
    return jsonify(reset_network_state())

@socketio.on('start_training')
def handle_start_training(data):
    global training_thread
    input_size = data['inputNodes']
    hidden_sizes = data['hiddenLayers']
    output_size = data['outputNodes']
    epochs = data['epochs']
    learning_rate = data['learningRate']
    num_data_points = data['numDataPoints'] 
    noise_level = data['noiseLevel']
    batch_size = data.get('batchSize', 1)

    print(hidden_sizes)

    training_data = generate_dummy_data(num_data_points, input_size, output_size, noise_level, batch_size)
    nn = SimpleNeuralNetwork(input_size, hidden_sizes, output_size)

    def training_callback(epoch, forward_data, backward_data, weights_biases_data, loss, all_activations, input_size):

        # Convert NumPy arrays in forward_data, backward_data, and weights_biases_data to lists
        def convert_to_list(data):
            if isinstance(data, np.ndarray):
                return data.tolist()
            elif isinstance(data, dict):  # Handle nested dictionaries
                return {key: convert_to_list(value) for key, value in data.items()}
            elif isinstance(data, list):  # Handle lists of ndarrays
                return [convert_to_list(item) for item in data]
            return data

        forward_data = convert_to_list(forward_data)
        backward_data = convert_to_list(backward_data)
        weights_biases_data = convert_to_list(weights_biases_data)
        all_activations = convert_to_list(all_activations)

        socketio.emit('training_update', {
            'input_size': input_size,
            'epoch': epoch,
            'forward_data': forward_data,
            'backward_data': backward_data,
            'weights_biases_data': weights_biases_data,
            'loss': loss,
            'all_activations': all_activations
        })

        socketio.emit('gradient_update', {
            'loss': loss,
            'epoch': epoch,
            'backward_data': backward_data
        })

    def train_model():
        try:
            # Wrap the original callback to include input_size
            def wrapped_callback(epoch, forward_data, backward_data, weights_biases_data, loss, all_activations):
                training_callback(epoch, forward_data, backward_data, weights_biases_data, loss, all_activations, input_size)

            nn.train_network(training_data, epochs, learning_rate, callback=wrapped_callback)
        except SystemExit:
            print("Training stopped.")
        except Exception as e:
            print(f"Training interrupted: {e}")

    # Start the training in a new thread
    training_thread = Thread(target=train_model)
    training_thread.start()

    emit('training_started', {"message": "Training started. Check WebSocket for updates."})

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('stop_training')
def stop_training():
    global training_thread
    if training_thread and training_thread.is_alive():
        raise_exception_in_thread(training_thread, SystemExit)  # Stop the training thread
        training_thread.join()  # Wait for the thread to finish
        training_thread = None
        socketio.emit('training_stopped', {"message": "Training stopped"}) 

if __name__ == '__main__':
    socketio.run(app, debug=True)