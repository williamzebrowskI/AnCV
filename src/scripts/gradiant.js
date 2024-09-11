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
    const resolution = 200;
    const maxDepth = 5;

    // Adjust camera and controls
    camera.position.set(8, 8, 15);
    camera.lookAt(0, 0, 0);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    // New variables for automatic rotation and zoom
    let isAutoRotating = true;
    let isAutoZooming = true;
    const rotationSpeed = 0.001;
    const zoomSpeed = 0.01;
    let initialCameraPosition = new THREE.Vector3(8, 8, 15);
    let targetZoomPosition = new THREE.Vector3();

    function resizeRendererToDisplaySize() {
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function cost(x1, x2, a = 1, b = 1, c = 0) {
        return a * x1 * x1 + b * x2 * x2 + c * Math.sin(x1) * Math.cos(x2);
    }

    function createSurface() {
        console.log("Creating complex surface...");
        const geometry = new THREE.PlaneGeometry(surfaceSize, surfaceSize, resolution, resolution);
        const positions = geometry.attributes.position.array;
        const colors = new Float32Array(positions.length);

        let minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i] / 5;
            const z = positions[i + 2] / 5;
            const y = cost(x, z, 1, 1, 0.5);
            positions[i + 1] = y;
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

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

    function updateVisualization(outputGradients) {
        console.log("Updating visualization with:", outputGradients);

        const [x, y] = outputGradients[outputGradients.length - 1];
        const height = cost(x, y, 1, 1, 0.5);

        const newPoint = new THREE.Vector3(x * 5, height, y * 5);
        gradientPath.push(newPoint);

        updateSurface(newPoint);

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

        if (currentDot) scene.remove(currentDot);
        const dotGeometry = new THREE.SphereGeometry(0.15, 32, 32);
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        currentDot = new THREE.Mesh(dotGeometry, dotMaterial);
        currentDot.position.copy(newPoint);
        scene.add(currentDot);

        // Update target zoom position
        targetZoomPosition.copy(newPoint).add(new THREE.Vector3(0, 2, 2));

        const trailGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const trailMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.position.copy(newPoint);
        scene.add(trail);

        const fadeOutDuration = 2000;
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

        createSurface();

        // Reset camera position and auto-rotation/zoom
        camera.position.copy(initialCameraPosition);
        camera.lookAt(0, 0, 0);
        isAutoRotating = true;
        isAutoZooming = true;

        console.log("Map refreshed.");
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5).normalize();
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffff00, 1, 10);
    scene.add(pointLight);

    createSurface();
    addDebugHelpers();

    function animate() {
        requestAnimationFrame(animate);

        if (isAutoRotating) {
            camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed);
        }

        if (isAutoZooming && currentDot) {
            camera.position.lerp(targetZoomPosition, zoomSpeed);
        }

        camera.lookAt(scene.position);
        controls.update();
        
        if (currentDot) {
            pointLight.position.copy(currentDot.position);
        }
        
        renderer.render(scene, camera);
    }
    animate();

    // Event listeners to pause auto-rotation and zoom when user interacts
    controls.addEventListener('start', function() {
        isAutoRotating = false;
        isAutoZooming = false;
    });

    controls.addEventListener('end', function() {
        isAutoRotating = true;
        isAutoZooming = true;
    });

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