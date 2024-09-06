import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import time
import numpy as np

class SimpleNeuralNetwork(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(SimpleNeuralNetwork, self).__init__()
        self.hidden = nn.Linear(input_size, hidden_size)  # This is input-to-hidden weights
        self.output = nn.Linear(hidden_size, output_size)  # This is hidden-to-output weights

    def forward(self, x):
        hidden_activation = F.gelu(self.hidden(x))
        output = self.output(hidden_activation)
        return output, hidden_activation

    def train_network(self, data, epochs, learning_rate, callback):
        criterion = nn.MSELoss()
        optimizer = optim.SGD(self.parameters(), lr=learning_rate)
        all_activations = []  # Accumulate activations here

        for epoch in range(epochs):
            epoch_loss = 0  # Initialize epoch loss
            batch_count = 0  # Initialize batch counter
            
            for inputs, targets in data:
                time.sleep(0.05)  # Simulate delay
                
                start_time = time.time()
                optimizer.zero_grad()  # Reset gradients

                # Forward pass
                outputs, hidden_activation = self.forward(inputs)
                forward_time = time.time() - start_time

                all_activations.append(hidden_activation.detach().cpu().numpy())

                # Compute the loss
                loss = criterion(outputs, targets)
                loss.backward()  # Backpropagation

                # Add the batch loss to the total epoch loss
                epoch_loss += loss.item()
                batch_count += 1

                # Backward pass timing
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
                    "input_weights": self.hidden.weight.detach().tolist(),  # Capture input-to-hidden weights
                    "hidden_weights": self.output.weight.detach().tolist(),  # Hidden-to-output weights
                    "hidden_biases": self.hidden.bias.detach().tolist(),
                    "output_weights": self.output.weight.detach().tolist(),
                    "output_biases": self.output.bias.detach().tolist()
                }

                optimizer.step()  # Update the weights

            # Compute the average loss for the epoch
            avg_epoch_loss = epoch_loss / batch_count
            print(f"Epoch: {epoch + 1}/{epochs}, Average Loss: {avg_epoch_loss}")

            # Emit the callback only after the entire epoch (not after every batch)
            callback(epoch, forward_data, backward_data, weights_biases_data, avg_epoch_loss, all_activations)

def generate_dummy_data(num_data_points, input_size, output_size, noise_level, batch_size=1):
    # Generate input data as a 2D array with shape (num_data_points, input_size)
    X = np.random.rand(num_data_points, input_size)

    # Generate output data (target) with noise
    y = np.sum(X, axis=1, keepdims=True) + noise_level * np.random.randn(num_data_points, output_size)
    
    # Convert to torch tensors
    X_tensor = torch.tensor(X, dtype=torch.float32)
    y_tensor = torch.tensor(y, dtype=torch.float32)
    # Group data into batches
    data = [(X_tensor[i:i + batch_size], y_tensor[i:i + batch_size])
            for i in range(0, num_data_points, batch_size)]
    
    return data