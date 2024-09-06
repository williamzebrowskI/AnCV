document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('gradientMapContainer');

    if (!container) {
        console.error("Container for gradient map not found.");
        return;
    }

    // Create a Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);

    // Adjust camera distance and angle for better view
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);

    // OrbitControls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    let surfaceMesh;

    // Define the cost function C(x1, x2) = x1^2 + x2^2
    function cost(x1, x2) {
        return x1 ** 2 + x2 ** 2;
    }

    // Create the surface based on the cost function
    function createCostSurface() {
        const geometry = new THREE.PlaneGeometry(20, 20, 50, 50);  // Adjust grid size if needed
        const positions = geometry.attributes.position.array;

        // Initialize the surface based on the cost function C(x1, x2)
        for (let i = 0; i < positions.length; i += 3) {
            const x1 = positions[i];      // X-axis value
            const x2 = positions[i + 1];  // Y-axis value
            const z = cost(x1, x2) / 10;  // Scale the cost function for visualization
            positions[i + 2] = z;         // Set the Z value (height)
        }

        geometry.computeVertexNormals();
        const material = new THREE.MeshPhongMaterial({ color: 0x88ccee, wireframe: true });
        surfaceMesh = new THREE.Mesh(geometry, material);
        scene.add(surfaceMesh);
    }

    // Interpolate gradients across the surface
    function interpolateGradient(row, col, hiddenGradients, gradientRows, gradientCols) {
        const rowFactor = (row / 50) * gradientRows;
        const colFactor = (col / 50) * gradientCols;
        const r = Math.min(Math.floor(rowFactor), gradientRows - 1);
        const c = Math.min(Math.floor(colFactor), gradientCols - 1);
        return hiddenGradients[r][c];
    }

    function updateGradientMap(hiddenGradients, outputGradients, loss) {
        // Ensure we have valid data
        if (!hiddenGradients || hiddenGradients.length === 0 || !Array.isArray(hiddenGradients[0])) {
            console.error("Invalid hidden gradient data format.");
            return;
        }

        const positions = surfaceMesh.geometry.attributes.position.array;
        const amplificationFactor = loss * 5;  // BOOSTED the amplification factor

        const gradientRows = hiddenGradients.length;
        const gradientCols = hiddenGradients[0].length;

        let minGradient = Infinity;
        let maxGradient = -Infinity;

        // First, find the min and max values in the gradient data for normalization
        for (let row = 0; row < gradientRows; row++) {
            for (let col = 0; col < gradientCols; col++) {
                const gradientValue = hiddenGradients[row][col];
                minGradient = Math.min(minGradient, gradientValue);
                maxGradient = Math.max(maxGradient, gradientValue);
            }
        }

        // Avoid divide-by-zero if all gradients are the same
        if (minGradient === maxGradient) {
            maxGradient += 1;
        }

        console.log(`Updating surface with loss: ${loss}, min gradient: ${minGradient}, max gradient: ${maxGradient}`);

        // Map the gradient data to the surface vertices
        for (let i = 0; i < positions.length; i += 3) {
            const vertexIndex = i / 3;
            const row = Math.floor(vertexIndex / 50);
            const col = vertexIndex % 50;

            // Get interpolated gradient for this vertex
            const gradientValue = interpolateGradient(row, col, hiddenGradients, gradientRows, gradientCols);
            const normalizedGradient = (gradientValue - minGradient) / (maxGradient - minGradient);
            const z = normalizedGradient * amplificationFactor;  // Amplify normalized gradient

            // Log gradient application for debugging
            if (vertexIndex % 100 === 0) {
                console.log(`Applying gradient at vertex ${vertexIndex} (row ${row}, col ${col}): ${gradientValue} (normalized: ${normalizedGradient})`);
            }

            positions[i + 2] = z;
        }

        // Mark the position attribute for update and recompute normals for smooth shading
        surfaceMesh.geometry.attributes.position.needsUpdate = true;
        surfaceMesh.geometry.computeVertexNormals();  // Recompute normals for smooth shading
    }

    window.updateGradientMap = updateGradientMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10).normalize();
    scene.add(directionalLight);

    // Create the surface but no path at the start
    createCostSurface();  // Create the initial cost function surface

    // Render loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
    });

    // Listen for gradient updates (from WebSocket or other events)
    socket.on('gradient_update', function(data) {
        const hiddenGradients = data.backward_data.hidden_grad;
        const outputGradients = data.backward_data.output_grad;
        const loss = data.loss;  // Get the loss from the backend

        console.log("Updating map with new gradients for epoch:", data.epoch);
        if (typeof window.updateGradientMap === 'function') {
            window.updateGradientMap(hiddenGradients, outputGradients, loss);
        } else {
            console.error("updateGradientMap function not found.");
        }
    });
});