import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import time
import numpy as np

class SimpleNeuralNetwork(nn.Module):
    def __init__(self, input_size, hidden_sizes, output_size):
        super(SimpleNeuralNetwork, self).__init__()

        self.hidden_layers = nn.ModuleList()
        previous_size = input_size

        for hidden_size in hidden_sizes:
            self.hidden_layers.append(nn.Linear(previous_size, hidden_size))
            previous_size = hidden_size

        self.output = nn.Linear(previous_size, output_size)

    def forward(self, x):
        hidden_activations = []
        for hidden_layer in self.hidden_layers:
            z = hidden_layer(x)  # Pre-activation
            a = F.gelu(z)  # Post-activation (applying GELU or your chosen activation function)
            hidden_activations.append((z, a))
            x = a  # Pass the post-activation to the next layer
        
        output = self.output(x)  # Final output layer
        return output, hidden_activations

    def train_network(self, data, epochs, learning_rate, callback):
        criterion = nn.MSELoss()
        optimizer = optim.SGD(self.parameters(), lr=learning_rate)
        all_activations = []

        for epoch in range(epochs):
            epoch_loss = 0
            batch_count = 0
            
            for inputs, targets in data:
                time.sleep(0.05)
                
                start_time = time.time()
                optimizer.zero_grad()  # Reset gradients

                # Forward pass
                outputs, hidden_activations = self.forward(inputs)
                forward_time = time.time() - start_time

                # Store all activations in each layer
                all_activations.append([(z.detach().cpu().numpy(), x.detach().cpu().numpy()) for z, x in hidden_activations])

                # Compute the loss
                loss = criterion(outputs, targets)
                loss.backward()  # Backpropagation

                # Add the batch loss to the total epoch loss
                epoch_loss += loss.item()
                batch_count += 1

                # Backward pass timing
                backward_time = time.time() - start_time - forward_time

                # Prepare forward and backward pass data for each hidden layer
                forward_data = {
                    "input": inputs.tolist(),
                    "hidden_activation": [{
                        "pre_activation": z.detach().cpu().numpy().tolist(),  # Keep all node values
                        "post_activation": a.detach().cpu().numpy().tolist()  # Keep all node values
                    } for z, a in hidden_activations],
                    "output": outputs.tolist(),
                    "forward_time": forward_time
                }

                backward_data = {
                    "hidden_grad": [layer.weight.grad.abs().detach().cpu().numpy().tolist() for layer in self.hidden_layers],
                    "output_grad": self.output.weight.grad.abs().detach().cpu().numpy().tolist(),
                    "backward_time": backward_time
                }
                weights_biases_data = {
                    "input_weights": self.hidden_layers[0].weight.detach().cpu().numpy().tolist(),
                    "hidden_weights": [layer.weight.detach().cpu().numpy().tolist() for layer in self.hidden_layers],
                    "hidden_biases": [layer.bias.detach().cpu().numpy().tolist() for layer in self.hidden_layers],
                    "output_weights": self.output.weight.detach().cpu().numpy().tolist(),
                    "output_biases": self.output.bias.detach().cpu().numpy().tolist()
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