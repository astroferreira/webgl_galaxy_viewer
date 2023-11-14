
let scene, camera, renderer, controls, particleSystem;

init();
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 200;

    // Renderer setup
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // Load data and create particles
    loadData();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function getFileNameFromQueryString() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('file'); // 'file' is the query string key
}

function loadData() {
    fetch(getFileNameFromQueryString())
        .then(response => response.text())
        .then(text => {
            const vertices = [];
            const sizes = [];
            const ages = [];
            const lines = text.split('\n');
            for (let line of lines) {
                const parts = line.split(' ').map(part => parseFloat(part));
                if (parts.length >= 5) {
                    vertices.push(parts[0]/1000, parts[1]/1000, parts[2]/1000); // x, y, z
                    sizes.push(parts[3]/200); // size
                    ages.push(parts[6]); // size
                }
            }
            addParticles(vertices, sizes, ages);
        });
}

function addParticles(vertices, sizes, ages) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('age', new THREE.Float32BufferAttribute(ages, 1));

        const vertexShader = `
        attribute float size;
        varying float vSize;
        attribute float age; // New attribute for the age of the star
        varying float vAge;

        void main() {
            vAge = age;
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    // Fragment Shader
    const fragmentShader = `
        uniform vec3 color;
        const float nu = 2.0; // Since we're working in 2 dimensions on the screen
        const float sigma = 4.0 / 3.0; // For 2 dimensions, this might be a value like 4/3
        varying float vSize;
        varying float vAge;
        void main() {
            float h_sm = vSize; // Use the size passed from the vertex shader
            float q = distance(gl_PointCoord, vec2(0.5, 0.5)) / h_sm;
            float alpha;

            if (q <= 0.5) {
                alpha = 1.0 - 6.0 * q * q + 6.0 * q * q * q;
            } else if (q <= 1.0) {
                alpha = 2.0 * pow(1.0 - q, 3.0);
            } else {
                discard; // Discard fragments beyond the particle radius
            }

            alpha *= pow(2.0, nu) / (pow(h_sm, nu) * sigma); // Apply normalization

            vec3 youngColor = vec3(0.0, 0.0, 1.0); // Blue
            vec3 middleColor = vec3(1.0, 1.0, 1.0); // Yellow
            vec3 oldColor = vec3(1.0, 0.0, 0.0); // Red
        
            float normalizedAge = clamp(vAge / 6880543969.0, 0.0, 1.0); // Normalize based on max age
        
            // Interpolate colors based on age
            vec3 starColor = mix(mix(youngColor, middleColor, smoothstep(0.0, 0.05, normalizedAge)),
                                 oldColor, smoothstep(0.3, 1.0, normalizedAge));
        
            gl_FragColor = vec4(starColor, alpha);

            //gl_FragColor = vec4(color, alpha);
        }
    `;

    // ShaderMaterial
    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.NormalBlending
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
