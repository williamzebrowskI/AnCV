let lossDisplay = document.getElementById("lossDisplay");
let lossChartCtx = document.getElementById("lossChart").getContext('2d');
let expanded = false; // Track the state of expansion

// Initialize the loss chart with Chart.js
let lossChart = new Chart(lossChartCtx, {
    type: 'line',
    data: {
        labels: [],  // Epochs
        datasets: [{
            label: 'Loss',
            data: [],  // Loss values
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: false,
            tension: 0.1
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Epochs'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Loss'
                },
                beginAtZero: true
            }
        }
    }
});

export function updateLossChart(epoch, loss) {
    lossChart.data.labels.push(epoch);
    lossChart.data.datasets[0].data.push(loss);
    lossChart.update();
}

export function handleExpandLossDisplay() {
    document.getElementById('expandBtn').addEventListener('click', function () {
        if (expanded) {
            lossDisplay.classList.remove('expanded'); // Shrink back to original size
            this.textContent = '<>'; // Change icon to indicate expandable
        } else {
            lossDisplay.classList.add('expanded'); // Expand to double size
            this.textContent = '<>'; // Change icon to indicate collapsible
        }
        expanded = !expanded; // Toggle the state
        lossChart.resize(); // Resize the chart to fill the expanded or collapsed box
    });
}