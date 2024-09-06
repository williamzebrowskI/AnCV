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
    camera.position.set(20, 15, 20);  // Adjust these values to zoom out and get the desired perspective
    camera.lookAt(0, 0, 0);

    // OrbitControls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    // Define the cost function and create surface, gradient descent path
    function cost(x1, x2) {
        return x1 ** 2 + x2 ** 2;
    }

    function createSurface() {
        const geometry = new THREE.PlaneGeometry(20, 20, 50, 50);
        const positions = geometry.attributes.position.array;

        for (let i = 0; i < positions.length; i += 3) {
            const x1 = positions[i];
            const x2 = positions[i + 1];
            const z = cost(x1, x2) / 10; // Scale down for visualization
            positions[i + 2] = z;
        }

        geometry.computeVertexNormals();
        const material = new THREE.MeshPhongMaterial({ color: 0x88ccee, wireframe: true });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
    }

    // Gradient Descent and Path Visualization
    function gradientDescent(epochs = 15, learningRate = 0.1) {
        let p1 = Math.random() * 20 - 10;  // Random start between -10 and 10
        let p2 = Math.random() * 20 - 10;
        const path = [[p1, p2]];

        for (let i = 0; i < epochs; i++) {
            const [grad1, grad2] = [2 * p1, 2 * p2];
            p1 -= learningRate * grad1;
            p2 -= learningRate * grad2;
            path.push([p1, p2]);
        }

        return path;
    }

    function createGradientDescentPath(path) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        path.forEach(([x1, x2]) => {
            vertices.push(x1, x2, cost(x1, x2) / 10);  // Scale down z for visualization
        });

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10).normalize();
    scene.add(directionalLight);

    // Create the surface and gradient descent path
    createSurface();
    const descentPath = gradientDescent();
    createGradientDescentPath(descentPath);

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
});