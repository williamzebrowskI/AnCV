document.getElementById('loadNetworkBtn').addEventListener('click', function() {
    const inputNodes = parseInt(document.getElementById('inputNodes').value);
    const hiddenLayers = document.getElementById('hiddenLayers').value.split(',').map(Number);
    const outputNodes = parseInt(document.getElementById('outputNodes').value);

    const layers = [inputNodes, ...hiddenLayers, outputNodes];
    drawNeuralNetwork(layers);
});

document.getElementById('trainNetworkBtn').addEventListener('click', function() {
    fetch('http://127.0.0.1:5000/train', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputNodes: parseInt(document.getElementById('inputNodes').value),
            hiddenLayers: document.getElementById('hiddenLayers').value.split(',').map(Number),
            outputNodes: parseInt(document.getElementById('outputNodes').value),
            epochs: 50 // Adjust as needed
        })
    })
    .then(response => response.json())
    .then(data => animateDataFlow(data))
    .catch(error => console.error('Error:', error));
});

let nodes = [];

function drawNeuralNetwork(layers) {
    d3.select("#visualization").html("");

    const width = window.innerWidth;
    const height = window.innerHeight;
    const svg = d3.select("#visualization").append("svg")
        .attr("width", width)
        .attr("height", height);

    const layerSpacing = width / (layers.length + 1);
    const nodeRadius = 20;

    nodes = [];

    layers.forEach((layerSize, layerIndex) => {
        const x = layerSpacing * (layerIndex + 1);
        const ySpacing = height / (layerSize + 1);

        for (let i = 0; i < layerSize; i++) {
            const y = ySpacing * (i + 1);

            const node = svg.append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", nodeRadius)
                .style("fill", "#69b3a2");

            nodes.push({ layerIndex, i, x, y, node });
        }
    });

    nodes.forEach(sourceNode => {
        if (sourceNode.layerIndex > 0) {
            const prevLayerNodes = nodes.filter(node => node.layerIndex === sourceNode.layerIndex - 1);

            prevLayerNodes.forEach(targetNode => {
                svg.append("line")
                    .attr("x1", targetNode.x)
                    .attr("y1", targetNode.y)
                    .attr("x2", sourceNode.x)
                    .attr("y2", sourceNode.y)
                    .attr("stroke", "#999")
                    .attr("stroke-width", 2)
                    .attr("class", `line-${sourceNode.layerIndex}-${sourceNode.i}-${targetNode.i}`);
            });
        }
    });
}

function animateDataFlow(data) {
    const svg = d3.select("svg");

    data.forEach((epochData, epochIndex) => {
        setTimeout(() => {
            const forwardDuration = epochData.forward_data.forward_time * 1000;
            const backwardDuration = epochData.backward_data.backward_time * 1000;

            animateForwardPass(epochData.forward_data, svg, forwardDuration);
            setTimeout(() => {
                animateBackwardPass(epochData.backward_data, svg, backwardDuration);
            }, forwardDuration + 500);
        }, epochIndex * 4000);
    });
}

function animateForwardPass(forwardData, svg, duration) {
    forwardData.input.forEach((input, index) => {
        const inputNode = nodes.find(node => node.layerIndex === 0 && node.i === index);
        animateLightThroughLayer(inputNode, forwardData.hidden_activation, duration, svg, "forward");
    });
}

function animateBackwardPass(backwardData, svg, duration) {
    const hiddenNodes = nodes.filter(node => node.layerIndex === 1);
    const outputNodes = nodes.filter(node => node.layerIndex === 2);

    outputNodes.forEach((outputNode, i) => {
        animateLightThroughLayer(outputNode, hiddenNodes, duration, svg, "backward");
    });

    hiddenNodes.forEach((hiddenNode, i) => {
        animateLightThroughLayer(hiddenNode, nodes.filter(node => node.layerIndex === 0), duration, svg, "backward");
    });
}

function animateLightThroughLayer(node, nextLayerData, duration, svg, direction) {
    const nextLayerNodes = nodes.filter(n => n.layerIndex === node.layerIndex + 1);

    nextLayerNodes.forEach((targetNode, i) => {
        const light = svg.append("circle")
            .attr("cx", node.x)
            .attr("cy", node.y)
            .attr("r", 5)
            .style("fill", "yellow")
            .style("opacity", 1);

        light.transition()
            .duration(duration)
            .attr("cx", targetNode.x)
            .attr("cy", targetNode.y)
            .ease(d3.easeLinear)
            .on("end", function() {
                if (direction === "forward" && node.layerIndex < nodes.length - 1) {
                    animateLightThroughLayer(targetNode, nextLayerData, duration, svg, "forward");
                } else if (direction === "backward") {
                    d3.select(this).remove();
                }
            });
    });
}

function dragStarted(event, d) {
    d3.select(this).raise().attr("stroke", "black");
}

function dragged(event, d) {
    d3.select(this)
        .attr("cx", event.x)
        .attr("cy", event.y);

    const draggedNode = nodes.find(n => n.node.node() === this);
    draggedNode.x = event.x;
    draggedNode.y = event.y;

    updateConnections(draggedNode);
}

function dragEnded(event, d) {
    d3.select(this).attr("stroke", null);
}

function updateConnections(draggedNode) {
    nodes.forEach(targetNode => {
        if (targetNode.layerIndex === draggedNode.layerIndex - 1) {
            d3.select(`.line-${draggedNode.layerIndex}-${draggedNode.i}-${targetNode.i}`)
                .attr("x1", targetNode.x)
                .attr("y1", targetNode.y)
                .attr("x2", draggedNode.x)
                .attr("y2", draggedNode.y);
        } else if (targetNode.layerIndex === draggedNode.layerIndex + 1) {
            d3.select(`.line-${targetNode.layerIndex}-${targetNode.i}-${draggedNode.i}`)
                .attr("x1", draggedNode.x)
                .attr("y1", draggedNode.y)
                .attr("x2", targetNode.x)
                .attr("y2", targetNode.y);
        }
    });
}