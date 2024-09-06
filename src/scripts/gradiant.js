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

    let surfaceMesh;
    let gradientPath;
    let currentSurfaceState = 0; // 0 to 1, represents progress of surface formation
    const maxDepth = 5; // Maximum depth of the surface

    // Adjust camera and controls
    camera.position.set(0, 20, 20);
    camera.lookAt(0, 0, 0);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    // Define the cost function C(x1, x2) = x1^2 + x2^2
    function cost(x1, x2) {
        return x1 ** 2 + x2 ** 2;
    }

    // Create the initial flat surface
    function createFlatSurface() {
        const geometry = new THREE.PlaneGeometry(20, 20, 50, 50);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x88ccee, 
            wireframe: false,
            side: THREE.DoubleSide
        });
        surfaceMesh = new THREE.Mesh(geometry, material);
        surfaceMesh.rotation.x = -Math.PI / 2;  // Rotate to lay flat
        scene.add(surfaceMesh);
        return surfaceMesh;
    }

    function updateSurface() {
        const positions = surfaceMesh.geometry.attributes.position.array;

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i] / 10;  // Scale down to match cost function
            const y = positions[i + 1] / 10;
            positions[i + 2] = cost(x, y) * maxDepth * currentSurfaceState;  // Gradually increase depth
        }

        surfaceMesh.geometry.attributes.position.needsUpdate = true;
        surfaceMesh.geometry.computeVertexNormals();
    }

    function updateGradientPath(outputGradients) {
        if (gradientPath) {
            scene.remove(gradientPath);
        }

        const pathGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(outputGradients.length * 3);

        for (let i = 0; i < outputGradients.length; i++) {
            const [x, y] = outputGradients[i];
            positions[i * 3] = x * 10;     // Scale to match surface size
            positions[i * 3 + 1] = y * 10; // Scale to match surface size
            positions[i * 3 + 2] = cost(x, y) * maxDepth * currentSurfaceState + 0.05; // Slightly above the surface
        }

        pathGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const pathMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
        gradientPath = new THREE.Line(pathGeometry, pathMaterial);
        scene.add(gradientPath);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10).normalize();
    scene.add(directionalLight);

    // Create the initial flat surface
    createFlatSurface();

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

    // Gradual surface formation
    function formSurface() {
        if (currentSurfaceState < 1) {
            currentSurfaceState += 0.05; // Adjust this value to change formation speed
            if (currentSurfaceState > 1) currentSurfaceState = 1;
            updateSurface();
        }
    }

    // Expose update function to global scope
    window.updateVisualization = function(outputGradients) {
        formSurface();
        updateGradientPath(outputGradients);
    };

    // Assume socket is defined elsewhere
    socket.on('gradient_update', function(data) {
        console.log("Received gradient update:", data);
        try {
            const outputGradients = data.backward_data.output_grad;

            if (!outputGradients) {
                throw new Error("Invalid gradient data structure");
            }

            window.updateVisualization(outputGradients);
        } catch (error) {
            console.error("Error processing gradient update:", error);
            console.error("Received data:", data);
        }
    });
});