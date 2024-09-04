import torch
import torch.nn as nn
import torch.optim as optim
import time
import numpy as np  # Added for random data generation

class SimpleNeuralNetwork(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(SimpleNeuralNetwork, self).__init__()
        self.hidden = nn.Linear(input_size, hidden_size)
        self.output = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        hidden_activation = torch.relu(self.hidden(x))
        output = self.output(hidden_activation)
        return output, hidden_activation

    def train_network(self, data, epochs, learning_rate, callback):
        criterion = nn.MSELoss()
        optimizer = optim.SGD(self.parameters(), lr=learning_rate)

        for epoch in range(epochs):
            for inputs, targets in data:
                start_time = time.time()

                optimizer.zero_grad()
                outputs, hidden_activation = self.forward(inputs)
                forward_time = time.time() - start_time

                loss = criterion(outputs, targets)
                loss.backward()
                backward_time = time.time() - start_time - forward_time

                # Capture forward pass activations, backward pass gradients, and weights/biases
                forward_data = {
                    "input": inputs.tolist(),
                    "hidden_activation": hidden_activation.tolist(),
                    "output": outputs.tolist(),
                    "forward_time": forward_time
                }
                backward_data = {
                    "hidden_grad": self.hidden.weight.grad.abs().tolist(),
                    "output_grad": self.output.weight.grad.abs().tolist(),
                    "backward_time": backward_time
                }
                weights_biases_data = {
                    "hidden_weights": self.hidden.weight.detach().tolist(),
                    "hidden_biases": self.hidden.bias.detach().tolist(),
                    "output_weights": self.output.weight.detach().tolist(),
                    "output_biases": self.output.bias.detach().tolist()
                }

                # Send data to the callback for visualization
                callback(epoch, forward_data, backward_data, weights_biases_data, loss.item())

                optimizer.step()

def generate_dummy_data(num_data_points, input_size, output_size, noise_level):
    # Generate input data as a 2D array with shape (num_data_points, input_size)
    X = np.random.rand(num_data_points, input_size)

    # Generate output data (target) with noise
    y = np.sum(X, axis=1, keepdims=True) + noise_level * np.random.randn(num_data_points, output_size)
    
    # Convert to torch tensors
    return [(torch.tensor(x, dtype=torch.float32), torch.tensor(y_, dtype=torch.float32)) for x, y_ in zip(X, y)]