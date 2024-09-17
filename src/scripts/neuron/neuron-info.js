// neuron-info.js

const activationHistories = new Map();

let isOverNode = false;
let isOverPopup = false;
let lastMousePosition = { x: 0, y: 0 };
let hidePopupTimeout;

let isSidebarCollapsed = false;
let popupOffset = { x: 0, y: 0 };
let currentNodeElement = null; // Added to keep track of the current node element

let tooltipDiv; // Tooltip div

export function createNeuronPopup(svg) {
  const popup = svg
    .append("g")
    .attr("class", "neuron-popup")
    .style("display", "none")
    .style("pointer-events", "all");

  popup
    .append("rect")
    .attr("width", 240)
    .attr("height", 340) // Increased height to accommodate the activation graph
    .attr("fill", "url(#popupGradient)")
    .attr("stroke", "rgba(0, 255, 255, 1)")
    .attr("stroke-width", 2)
    .attr("rx", 15)
    .attr("ry", 15)
    .style("filter", "drop-shadow(0 0 15px rgba(0, 100, 255, 1))");

  svg
    .append("defs")
    .append("linearGradient")
    .attr("id", "popupGradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%")
    .selectAll("stop")
    .data([
      { offset: "0%", color: "#0f0f0f" },
      { offset: "100%", color: "#2f2f2f" },
    ])
    .enter()
    .append("stop")
    .attr("offset", (d) => d.offset)
    .attr("stop-color", (d) => d.color);

  popup
    .append("text")
    .attr("class", "popup-title")
    .attr("x", 15)
    .attr("y", 30)
    .attr("fill", "rgba(255, 99, 132, 1)")
    .style("font-family", "'Orbitron', sans-serif")
    .style("font-weight", "bold")
    .style("font-size", "18px")
    .style("text-shadow", "0 0 8px rgba(255, 99, 132, 1)");

  const fields = ["weight", "bias", "pre-activation", "activation", "gradient"];

  fields.forEach((field, index) => {
    popup
      .append("text")
      .attr("class", `popup-${field}`)
      .attr("x", 15)
      .attr("y", 60 + index * 30)
      .attr("fill", "#ffffff")
      .style("font-family", "'Orbitron', sans-serif")
      .style("font-size", "14px")
      .style("text-shadow", "0 0 6px rgba(255, 99, 132, 1)")
      .style("animation", "glowAnimation 2s infinite");
  });

  popup
    .append("path")
    .attr("class", "sparkline")
    .attr("fill", "none")
    .attr("stroke", "rgba(0, 255, 255, 1)")
    .attr("stroke-width", 2)
    .style("filter", "drop-shadow(0 0 8px rgba(0, 255, 255, 1))");

  // Add SVG for activation graph
  const graphGroup = popup
    .append("g")
    .attr("class", "activation-graph")
    .attr("transform", "translate(15, 240)");

  graphGroup
    .append("rect")
    .attr("width", 210)
    .attr("height", 80)
    .attr("fill", "none")
    .attr("stroke", "rgba(0, 255, 255, 0.5)");

  graphGroup
    .append("path")
    .attr("class", "activation-line")
    .attr("fill", "none")
    .attr("stroke", "rgba(0, 255, 255, 1)")
    .attr("stroke-width", 2);

  svg.append("style").text(`
        @keyframes glowAnimation {
            0%, 100% { text-shadow: 0 0 8px rgba(255, 99, 132, 1); }
            50% { text-shadow: 0 0 12px rgba(255, 99, 132, 1); }
        }
    `);

  // Create tooltip div
  tooltipDiv = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("text-align", "left")
    .style("padding", "8px")
    .style("font-size", "12px")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("color", "#fff")
    .style("border", "0px")
    .style("border-radius", "8px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Definitions for the fields
  const definitions = {
    weight: "Weight: The parameter that scales the input signal in a neuron.",
    bias: "Bias: The parameter that allows shifting the activation function.",
    "pre-activation":
      "Weighted Sum: The sum of the weighted inputs plus bias before applying the activation function.",
    activation:
      "Activation: The output of the neuron after applying the activation function.",
    gradient:
      "Gradient: The derivative of the loss function with respect to the neuron's output.",
  };

  // Add event listeners for tooltip
  fields.forEach((field) => {
    popup
      .select(`.popup-${field}`)
      .on("mouseover", function (event) {
        showTooltip(event, definitions[field]);
      })
      .on("mousemove", function (event) {
        moveTooltip(event);
      })
      .on("mouseout", hideTooltip);
  });

  popup
    .on("mouseenter", function (event) {
      isOverPopup = true;
      clearTimeout(hidePopupTimeout);
    })
    .on("mouseleave", function (event) {
      isOverPopup = false;
      if (!isOverNode) {
        hidePopupTimeout = setTimeout(() => hideNeuronPopup(popup), 300);
      }
    });

  return d3.select(popup.node());
}

function showTooltip(event, text) {
  tooltipDiv
    .transition()
    .duration(200)
    .style("opacity", 0.9);
  tooltipDiv
    .html(text)
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 28 + "px");
}

function moveTooltip(event) {
  tooltipDiv
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 28 + "px");
}

function hideTooltip(event) {
  tooltipDiv
    .transition()
    .duration(500)
    .style("opacity", 0);
}

export function handleNeuronMouseover(
  popupGroup,
  popup,
  event,
  layerType,
  nodeIndex,
  nodeData
) {
  isOverNode = true;
  clearTimeout(hidePopupTimeout);
  currentNodeElement = event.target; // Keep track of the current node element

  d3.select(event.target)
    .style("stroke", "rgba(0, 255, 255, 1)")
    .style("stroke-width", "6px")
    .style("filter", "drop-shadow(0 0 20px rgba(0, 255, 255, 1))");

  setPopupOffset();

  updateNeuronPopup(
    popup,
    event.target.cx.baseVal.value,
    event.target.cy.baseVal.value,
    { layerType, nodeIndex, ...nodeData }
  );

  popupGroup.raise();
  popup.style("display", "block");

  document.addEventListener("mousemove", trackMouseMovement);
}

export function handleNeuronMouseleave(popup, event) {
  isOverNode = false;

  d3.select(event.target)
    .style("stroke", "rgba(0, 255, 255, 1)")
    .style("stroke-width", "4px")
    .style("filter", "drop-shadow(0 0 15px rgba(0, 100, 255, 1))");

  if (!isMouseEnteringPopup(event, popup)) {
    hidePopupTimeout = setTimeout(() => hideNeuronPopup(popup), 300);
  }
}

// Helper function to check if mouse is entering the popup
function isMouseEnteringPopup(event, popup) {
  const related = event.relatedTarget;
  return related && (related === popup.node() || popup.node().contains(related));
}

// Helper function to check if mouse is entering the node
function isMouseEnteringNode(event) {
  const related = event.relatedTarget;
  return (
    related &&
    (related === currentNodeElement || currentNodeElement.contains(related))
  );
}

const trackMouseMovement = (event) => {
  lastMousePosition = { x: event.clientX, y: event.clientY };
};

export function getNodeData(layerIndex, i, forwardData, data, layers) {
  console.log("getNodeData called with:", {
    layerIndex,
    i,
    forwardData,
    data,
    layers,
  });

  const nodeData = {
    weight: "N/A",
    bias: "N/A",
    preActivation: "N/A",
    activation: "N/A",
    gradient: "N/A",
    backpropHistory: [],
  };

  if (!data || !forwardData) {
    console.log("Data or forwardData is undefined");
    return nodeData;
  }

  const currentEpoch = data.epoch;
  const sampleIndex = 0; // We'll use the first sample in the batch for visualization

  const formatValue = (value) => {
    if (typeof value === "number") {
      return value.toFixed(4);
    } else if (Array.isArray(value)) {
      return value.map(formatValue);
    }
    return value;
  };

  if (layerIndex === 0) {
    // Input layer
    const rawValue = forwardData.input[sampleIndex][i];
    nodeData.inputValue = typeof rawValue === "number" ? rawValue : 0; // Default to 0 if undefined
    console.log(`Input value for node ${i}:`, nodeData.inputValue);
  } else if (layerIndex > 0 && layerIndex < layers.length - 1) {
    // Hidden layers
    const hiddenLayerIndex = layerIndex - 1;
    const hiddenActivation = forwardData.hidden_activation[hiddenLayerIndex];

    if (hiddenActivation) {
      nodeData.preActivation = formatValue(
        hiddenActivation.pre_activation[sampleIndex][i]
      );
      nodeData.activation = formatValue(
        hiddenActivation.post_activation[sampleIndex][i]
      );
    }

    if (data.weights_biases_data) {
      nodeData.weight = data.weights_biases_data.hidden_weights[hiddenLayerIndex][i];
      nodeData.bias = formatValue(
        data.weights_biases_data.hidden_biases[hiddenLayerIndex][i]
      );
    }

    if (data.backward_data && data.backward_data.hidden_grad) {
      nodeData.gradient = formatValue(
        data.backward_data.hidden_grad[hiddenLayerIndex][sampleIndex][i]
      );
    }
  } else if (layerIndex === layers.length - 1) {
    // Output layer
    nodeData.activation = formatValue(forwardData.output[sampleIndex][i]);

    if (data.weights_biases_data) {
      nodeData.weight = data.weights_biases_data.output_weights[i];
      nodeData.bias = formatValue(data.weights_biases_data.output_biases[i]);
    }

    if (data.backward_data && data.backward_data.output_grad) {
      nodeData.gradient = formatValue(
        data.backward_data.output_grad[sampleIndex][i]
      );
    }
  }

  console.log(`Node data for layer ${layerIndex}, node ${i}:`, nodeData);
  return nodeData;
}

function setPopupOffset() {
  const popupWidth = 240; // Width of the popup
  const popupHeight = 340; // Updated height of the popup
  const neuronRadius = 20; // Actual radius of the neuron circle
  const spacing = 15; // Space between neuron and popup

  // Calculate offset
  popupOffset.x = neuronRadius + spacing;
  popupOffset.y = -popupHeight / 2;
}

export function updateNeuronPopup(popup, neuronX, neuronY, data) {
  updatePopupPosition(popup, neuronX, neuronY);
  popup.style("display", "block");
  popup.select(".popup-title").text(`${data.layerType} Node ${data.nodeIndex}`);

  const formatValue = (value) => {
    if (typeof value === "number") return value.toFixed(4);
    if (Array.isArray(value)) {
      const numericValues = value.filter((v) => typeof v === "number");
      if (numericValues.length === 0) return "N/A";
      const avg = d3.mean(numericValues).toFixed(4);
      const [min, max] =
        numericValues.length > 1
          ? [d3.min(numericValues).toFixed(4), d3.max(numericValues).toFixed(4)]
          : [null, null];
      return { avg, min, max, hasMinMax: numericValues.length > 1 };
    }
    return value || "N/A";
  };

  const nodeId = `${data.layerType}-${data.nodeIndex}`;
  let history = activationHistories.get(nodeId) || [];

  // Update popup content and collect history
  let newEntry = {};
  if (data.layerType === "Input") {
    const inputValue = formatValue(data.inputValue);
    popup.select(".popup-weight").text(`Input Value: ${inputValue}`);
    ["bias", "pre-activation", "activation", "gradient"].forEach((field) =>
      popup.select(`.popup-${field}`).text("")
    );
    newEntry = { inputValue };
  } else {
    const weightInfo = formatValue(data.weight);
    const biasValue = formatValue(data.bias);
    const preActivationValue = formatValue(data.preActivation);
    const activationValue = formatValue(data.activation);
    const gradientValue = formatValue(data.gradient);

    popup
      .select(".popup-weight")
      .text(
        `Weight: ${
          typeof weightInfo === "object" ? weightInfo.avg : weightInfo
        }`
      )
      .append("tspan")
      .attr("x", 30)
      .attr("dy", weightInfo.hasMinMax ? "1.2em" : 0)
      .text(
        weightInfo.hasMinMax ? `Min: ${weightInfo.min}, Max: ${weightInfo.max}` : ""
      );
    popup.select(".popup-bias").text(`Bias: ${biasValue}`);
    popup.select(".popup-pre-activation").text(`Weighted Sum: ${preActivationValue}`);
    popup.select(".popup-activation").text(`Activation: ${activationValue}`);
    popup.select(".popup-gradient").text(`Gradient: ${gradientValue}`);

    newEntry = {
      weight: typeof weightInfo === "object" ? weightInfo.avg : weightInfo,
      bias: biasValue,
      preActivation: preActivationValue,
      activation: activationValue,
      gradient: gradientValue,
    };
  }

  // Add new entry to history
  history.push(newEntry);

  // Limit history to last 50 entries
  if (history.length > 50) history = history.slice(-50);
  activationHistories.set(nodeId, history);

  console.log(
    "Updated history for node:",
    nodeId,
    JSON.parse(JSON.stringify(history))
  );

  // Update sparkline if backpropHistory is available
  if (data.backpropHistory?.length > 0) {
    const lineGenerator = d3
      .line()
      .x((_, i) => i * 20)
      .y((d) => d * -20);
    popup
      .select(".sparkline")
      .attr("d", lineGenerator(data.backpropHistory))
      .attr("transform", "translate(10, 200)");
  } else {
    popup.select(".sparkline").attr("d", "");
  }
}

export function hideNeuronPopup(popup) {
  popup.style("display", "none");
  popup.currentNode = null; // Clear the current node when hiding the popup
  document.removeEventListener("mousemove", trackMouseMovement);
}

export function updateSidebarState(collapsed) {
  isSidebarCollapsed = collapsed;
}

export function updatePopupPosition(popup, neuronX, neuronY) {
  const x = neuronX + popupOffset.x;
  const y = neuronY + popupOffset.y;
  popup.attr("transform", `translate(${x},${y})`);
}

// Export isOverPopup for use in node.js
export { isOverPopup };