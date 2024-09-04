import torch
import torch.nn as nn
import torch.optim as optim
import time

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

                callback(epoch, forward_data, backward_data, loss)
                optimizer.step()