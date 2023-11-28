
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


function abMagToFlux(abMag) {
    return Math.pow(10, -0.4 * (abMag-50));
}

function asinhStretch(flux, alpha, Q, F0) {
    return Math.asinh(alpha * Q * (flux / F0)) / Q;
}


function loadData() {
    const fileName = getFileNameFromQueryString();
    if (!fileName) {
        console.error('No file specified in the query string');
        return;
    }

    fetch(fileName)
        .then(response => response.text())
        .then(text => {
            const vertices = [];
            const sizes = [];
            const ages = [];
            let maximumAge = 0; // Initialize maximumAge

            const lines = text.split('\n');
            for (let line of lines) {
                const parts = line.trim().split(/\s+/).map(part => parseFloat(part));
                if (parts.length >= 5) {
                    vertices.push(parts[0]/1000, parts[1]/1000, parts[2]/1000); // x, y, z
                    sizes.push(1)//parts[3]/100); // size
                    ages.push(parts[6]); // age
                    if (parts[6] > maximumAge) { // Update maximumAge if current age is larger
                        maximumAge = parts[6];
                    }
                }
            }

            console.log("Maximum Age:", maximumAge); // For debugging
            addParticles(vertices, sizes, ages, maximumAge);
        })
        .catch(error => console.error('Error loading data:', error)); // Error handling
}



function addParticles(vertices, sizes, ages, maximumAge) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    //geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('age', new THREE.Float32BufferAttribute(ages, 1));
    //geometry.setAttribute('mAge', new THREE.Float32BufferAttribute(ages, 1));

    // Create the material and pass maximumAge to the shade
        const vertexShader = `
        attribute float size;
        varying float vSize;
        attribute vec3 color; // New attribute for the color
        attribute float age; // New attribute for the color
        varying vec3 vColor;
        varying float vAge;


        void main() {
            vColor = color;
            vSize = size;
            vAge = age;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    // Fragment Shader
    const fragmentShader = `
        uniform vec3 color;
        varying vec3 vColor;
        const float nu = 2.0; // Since we're working in 2 dimensions on the screen
        const float sigma = 4.0 / 3.0; // For 2 dimensions, this might be a value like 4/3
        varying float vSize;
        varying float vAge;
        //varying float maxAge;
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

            // Create a color map that represents the spectrum from violet to red
            vec3 colorMap[7];
            colorMap[0] = vec3(0.56, 0.0, 1.0); // Violet
            colorMap[1] = vec3(0.0, 0.0, 1.0);  // Blue
            colorMap[2] = vec3(1.0, 1.0, 1.0);  // Cyan
            colorMap[3] = vec3(1.0, 1.0, 1.0);  // Green
            colorMap[4] = vec3(1.0, 1.0, 0.0);  // Yellow
            colorMap[5] = vec3(1.0, 0.5, 0.0);  // Orange
            colorMap[6] = vec3(1.0, 0.0, 0.0);  // Red
        
            float normalizedAge = clamp(vAge / 7000000000.0, 0.0, 1.0); // Normalize based on max age
        
            // Determine color based on normalized age
            int index1 = int(normalizedAge * 6.0); // Integer part
            int index2 = index1 + 1;               // Next index
            float fractBetween = fract(normalizedAge * 6.0); // Fractional part
        
            // Linearly interpolate between two nearest colors
            vec3 starColor = mix(colorMap[index1], colorMap[index2], fractBetween);
        
            gl_FragColor = vec4(starColor, alpha);
        }
    `;

    // ShaderMaterial
    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            maxAge: { value: maximumAge }
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
   
    controls.update(); // Only required if using OrbitControls
    renderer.render(scene, camera);
}