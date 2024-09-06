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
    camera.position.set(0, 10, 0);
    camera.lookAt(0, 0, 0);

    // Add OrbitControls
    let controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    let surfaceMesh;

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
    
        const amplificationFactor = 2;
    
        for (let i = 0, k = 0; i < resolution; i++) {
            if (!hiddenGradients[i] || !outputGradients[i]) continue; // Skip undefined rows
            for (let j = 0; j < hiddenGradients[i].length; j++, k++) {
                const index = k * 3;
                const x = positions[index];
                const y = positions[index + 1];
    
                const z = (hiddenGradients[i][j] - minGradient) / (maxGradient - minGradient) * amplificationFactor;
                positions[index + 2] = z;
    
                const hiddenGradientNorm = (hiddenGradients[i][j] - minGradient) / (maxGradient - minGradient);
                const outputGradientNorm = (outputGradients[i][j] - minGradient) / (maxGradient - minGradient);
    
                color.setRGB(
                    hiddenGradientNorm,
                    (hiddenGradientNorm + outputGradientNorm) / 2,
                    outputGradientNorm
                );
                color.toArray(colors, index);
            }
        }
    
        geometry.computeVertexNormals();
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            shininess: 50,
            flatShading: true
        });
    
        if (surfaceMesh) {
            surfaceMesh.geometry.dispose();
            surfaceMesh.geometry = geometry;
        } else {
            surfaceMesh = new THREE.Mesh(geometry, material);
            scene.add(surfaceMesh);
        }
    }

    // Add lighting to enhance the 3D effect
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // Add a point light to create more dramatic shadows
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
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

    window.updateGradientMap = function(hiddenGradients, outputGradients) {
        console.log("Hidden Gradients:", hiddenGradients);
        console.log("Output Gradients:", outputGradients);
        if (!hiddenGradients || !outputGradients || hiddenGradients.length === 0 || outputGradients.length === 0) {
            console.error("Gradient data is missing or empty.");
            return;
        }
        updateSurface(hiddenGradients, outputGradients);
    };
});