document.addEventListener('DOMContentLoaded', function() {
    const gradientMapContainer = document.getElementById('gradientMapContainer');

    if (!gradientMapContainer) {
        console.error("Container for gradient map not found.");
        return;
    }

    // Create a Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, gradientMapContainer.offsetWidth / gradientMapContainer.offsetHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(gradientMapContainer.offsetWidth, gradientMapContainer.offsetHeight);
    gradientMapContainer.appendChild(renderer.domElement);

    // Set the camera position to see the surface
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    // Add OrbitControls
    let controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    let surfaceMesh;

    // Function to create and update the surface based on gradient data
    function updateSurface(hiddenGradients, outputGradients) {
        if (!hiddenGradients || !outputGradients || hiddenGradients.length === 0 || outputGradients.length === 0) {
            console.error("Invalid gradient data. Cannot update surface.");
            return;
        }

        const resolution = hiddenGradients.length;
        const geometry = new THREE.PlaneGeometry(10, 10, resolution - 1, resolution - 1);
        const positions = geometry.attributes.position.array;
        const colors = new Float32Array(positions.length);
        const color = new THREE.Color();

        let minGradient = Infinity;
        let maxGradient = -Infinity;

        // Find min and max gradient values for normalization
        for (let i = 0; i < resolution; i++) {
            if (!hiddenGradients[i] || !outputGradients[i]) continue; // Skip undefined rows
            for (let j = 0; j < hiddenGradients[i].length; j++) {
                const gradientValue = hiddenGradients[i][j];
                minGradient = Math.min(minGradient, gradientValue);
                maxGradient = Math.max(maxGradient, gradientValue);
            }
        }

        const amplificationFactor = 2; // Adjust for better visualization

        for (let i = 0, k = 0; i < resolution; i++) {
            if (!hiddenGradients[i] || !outputGradients[i]) continue; // Skip undefined rows
            for (let j = 0; j < hiddenGradients[i].length; j++, k++) {
                const index = k * 3;
                const x = positions[index];
                const y = positions[index + 1];
    
                // Amplify z-value (height) based on hidden gradients
                const z = (hiddenGradients[i][j] - minGradient) / (maxGradient - minGradient) * amplificationFactor;
                positions[index + 2] = z;
    
                // Normalize gradient values for color mapping
                const hiddenGradientNorm = (hiddenGradients[i][j] - minGradient) / (maxGradient - minGradient);
                const outputGradientNorm = (outputGradients[i][j] - minGradient) / (maxGradient - minGradient);
    
                // Map the colors to blue, purple, and pink
                // Blue at hidden gradient low, purple in middle, pink at output gradient high
                const colorMix = (hiddenGradientNorm + outputGradientNorm) / 2;
                const r = 1.0 - colorMix;  // Redder as it goes higher
                const g = 0.0;  // No green in the gradient
                const b = colorMix;  // More blue in the gradient
    
                color.setRGB(r, g, b);  // Set color between blue and pinkish
                color.toArray(colors, index);
            }
        }
        
        geometry.computeVertexNormals();
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Create surface material
        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            shininess: 50,
            flatShading: true
        });

        // Add wireframe overlay to make the surface more grid-like (optional)
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff, // White wireframe for better visibility
            wireframe: true,
            opacity: 0.5,   // Set semi-transparency
            transparent: true  // Enable transparency
        });

        // If a surface already exists, update it
        if (surfaceMesh) {
            surfaceMesh.geometry.dispose();
            surfaceMesh.geometry = geometry;
        } else {
            // Add new surface mesh to scene
            surfaceMesh = new THREE.Mesh(geometry, material);
            scene.add(surfaceMesh);
            const wireframe = new THREE.Mesh(geometry, wireframeMaterial);
            scene.add(wireframe);
        }
    }

    // Add lighting to enhance the 3D effect
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Main light
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // Add a point light to create more dramatic shadows
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    // Add axes for better orientation
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Function to add text labels for axes
    function addLabel(text, position) {
        const loader = new THREE.FontLoader();
        loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(font) {
            const geometry = new THREE.TextGeometry(text, {
                font: font,
                size: 0.5,
                height: 0.1
            });
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const label = new THREE.Mesh(geometry, material);
            label.position.copy(position);
            scene.add(label);
        });
    }

    // Add labels for X, Y, and Z axes
    addLabel('Neuron Index X', new THREE.Vector3(6, -1, 0)); // Adjust positions as needed
    addLabel('Neuron Index Y', new THREE.Vector3(0, -1, 6));
    addLabel('Gradient Magnitude Z', new THREE.Vector3(0, 5, 0));

    function animate() {
        requestAnimationFrame(animate);
        controls.update(); // Update controls for interactive rotation and zoom
        renderer.render(scene, camera);
    }
    animate();

    // Handle window resizing
    window.addEventListener('resize', onWindowResize, false);

    function onWindowResize() {
        camera.aspect = gradientMapContainer.offsetWidth / gradientMapContainer.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(gradientMapContainer.offsetWidth, gradientMapContainer.offsetHeight);
    }

    // Expose the updateGradientMap function globally
    window.updateGradientMap = function(hiddenGradients, outputGradients) {
        console.log("Hidden Gradients:", hiddenGradients);
        console.log("Output Gradients:", outputGradients);
        if (!hiddenGradients || !outputGradients || hiddenGradients.length === 0 || outputGradients.length === 0) {
            console.error("Gradient data is missing or empty.");
            return;
        }
        updateSurface(hiddenGradients, outputGradients); // Call updateSurface with the gradients
    };
});