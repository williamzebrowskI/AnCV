document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('gradientMapContainer');
    const expandGradientBtn = document.getElementById('expandGradientBtn');
    let isGradientExpanded = false;

    // Expand/Collapse functionality for the gradient map
    expandGradientBtn.addEventListener('click', function () {
        if (isGradientExpanded) {
            container.classList.remove('expanded');
            expandGradientBtn.textContent = '<>';
        } else {
            container.classList.add('expanded');
            expandGradientBtn.textContent = '<>';
        }
        isGradientExpanded = !isGradientExpanded;
        resizeRendererToDisplaySize();
    });

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
    let gradientPath = [];
    let pathLine;
    let currentDot;
    const surfaceSize = 15;
    const resolution = 200; // Increased resolution for smoother surface
    const maxDepth = 5; // Maximum depth of the surface

    // Adjust camera and controls
    camera.position.set(8, 8, 15);
    camera.lookAt(0, 0, 0);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    function resizeRendererToDisplaySize() {
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    // Enhanced cost function with adjustable parameters
    function cost(x1, x2, a = 1, b = 1, c = 0) {
        return a * x1 * x1 + b * x2 * x2 + c * Math.sin(x1) * Math.cos(x2);
    }

    // Create a more complex surface
    function createSurface() {
        console.log("Creating complex surface...");
        const geometry = new THREE.PlaneGeometry(surfaceSize, surfaceSize, resolution, resolution);
        const positions = geometry.attributes.position.array;
        const colors = new Float32Array(positions.length);

        let minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i] / 5;
            const z = positions[i + 2] / 5;
            const y = cost(x, z, 1, 1, 0.5); // Adjust parameters for different surfaces
            positions[i + 1] = y;
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        // Color mapping based on height
        for (let i = 0; i < positions.length; i += 3) {
            const y = positions[i + 1];
            const t = (y - minY) / (maxY - minY);
            const color = new THREE.Color().setHSL(0.7 - 0.7 * t, 1, 0.5);
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({ 
            vertexColors: true,
            side: THREE.DoubleSide,
            shininess: 50
        });
        surfaceMesh = new THREE.Mesh(geometry, material);
        surfaceMesh.rotation.x = -Math.PI / 2;
        scene.add(surfaceMesh);
        console.log("Complex surface created and added to scene.");
    }

    function addDebugHelpers() {
        const axesHelper = new THREE.AxesHelper(10);
        scene.add(axesHelper);

        const gridHelper = new THREE.GridHelper(20, 20);
        scene.add(gridHelper);

        console.log("Debug helpers added to scene.");
    }

    // Update surface with dynamic depression
    function updateSurface(position) {
        const positions = surfaceMesh.geometry.attributes.position.array;
        const colors = surfaceMesh.geometry.attributes.color.array;
        let minY = Infinity, maxY = -Infinity;

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i] / 5;
            const z = positions[i + 2] / 5;
            let y = cost(x, z, 1, 1, 0.5);

            const dx = x - position.x / 5;
            const dz = z - position.z / 5;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const depression = Math.exp(-distance / 0.5) * 0.5;
            y -= depression;

            positions[i + 1] = y;
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        // Update colors based on new heights
        for (let i = 0; i < positions.length; i += 3) {
            const y = positions[i + 1];
            const t = (y - minY) / (maxY - minY);
            const color = new THREE.Color().setHSL(0.7 - 0.7 * t, 1, 0.5);
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        surfaceMesh.geometry.attributes.position.needsUpdate = true;
        surfaceMesh.geometry.attributes.color.needsUpdate = true;
        surfaceMesh.geometry.computeVertexNormals();
    }

    // Enhanced visualization update
    function updateVisualization(outputGradients) {
        console.log("Updating visualization with:", outputGradients);

        const [x, y] = outputGradients[outputGradients.length - 1];
        const height = cost(x, y, 1, 1, 0.5);

        const newPoint = new THREE.Vector3(x * 5, height, y * 5);
        gradientPath.push(newPoint);

        updateSurface(newPoint);

        // Update path line with gradient coloring
        if (pathLine) scene.remove(pathLine);
        const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(gradientPath);
        const colors = new Float32Array(gradientPath.length * 3);
        for (let i = 0; i < gradientPath.length; i++) {
            const color = new THREE.Color().setHSL(i / gradientPath.length, 1, 0.5);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        lineGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        pathLine = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(pathLine);

        // Update current position dot
        if (currentDot) scene.remove(currentDot);
        const dotGeometry = new THREE.SphereGeometry(0.15, 32, 32);
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        currentDot = new THREE.Mesh(dotGeometry, dotMaterial);
        currentDot.position.copy(newPoint);
        scene.add(currentDot);

        // Add a trail effect
        const trailGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const trailMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.position.copy(newPoint);
        scene.add(trail);

        // Animate trail fade-out
        const fadeOutDuration = 2000; // 2 seconds
        const startOpacity = 0.7;
        const startTime = Date.now();
        function animateTrail() {
            const elapsedTime = Date.now() - startTime;
            const opacity = Math.max(0, startOpacity - (elapsedTime / fadeOutDuration) * startOpacity);
            trail.material.opacity = opacity;
            if (opacity > 0) {
                requestAnimationFrame(animateTrail);
            } else {
                scene.remove(trail);
            }
        }
        animateTrail();

        console.log("Visualization updated. Path length:", gradientPath.length);
    }

    function refreshMap() {
        console.log("Refreshing map...");
        
        if (pathLine) {
            scene.remove(pathLine);
            pathLine = null;
        }
        if (currentDot) {
            scene.remove(currentDot);
            currentDot = null;
        }
        
        gradientPath = [];

        createSurface(); // Recreate the surface to reset it

        console.log("Map refreshed.");
    }

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5).normalize();
    scene.add(directionalLight);

    // Add a point light that follows the current position
    const pointLight = new THREE.PointLight(0xffff00, 1, 10);
    scene.add(pointLight);

    createSurface();
    addDebugHelpers();

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        
        // Update point light position
        if (currentDot) {
            pointLight.position.copy(currentDot.position);
        }
        
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', resizeRendererToDisplaySize);

    console.log("Animation loop started.");

    window.addEventListener('resize', resizeRendererToDisplaySize);

    window.updateVisualization = updateVisualization;
    window.refreshMap = refreshMap;

    var socket = io.connect('http://127.0.0.1:5000');

    socket.on('gradient_update', function(data) {
        console.log("Received gradient update from socket:", data);
        try {
            const outputGradients = data.backward_data.output_grad;
            if (!outputGradients || !Array.isArray(outputGradients)) {
                throw new Error("Invalid gradient data structure");
            }
            console.log("Calling updateVisualization with:", outputGradients);
            window.updateVisualization(outputGradients);
        } catch (error) {
            console.error("Error processing gradient update:", error);
        }
    });

    console.log("Scene children:", scene.children);
});