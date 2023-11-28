
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


let toggleStars = false;
let toggleBurst = false;
let toggleOld = false;


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

    fetch(fileName + '_stars_.dat')
        .then(response => response.text())
        .then(text => {
            const vertices = [];
            const sizes = [];
            const ages = [];
            const lines = text.split('\n');
            for (let line of lines) {
                const parts = line.trim().split(/\s+/).map(part => parseFloat(part));
                if (parts.length >= 5) {
                    vertices.push(parts[0]/1000, parts[1]/1000, parts[2]/1000); // x, y, z
                    sizes.push(parts[3]/500); // size
                    if (Math.log10(parts[6]) < 9) {
                        ages.push(1)
                    } else if (Math.log10(parts[6]) > 9.84) {
                        
                        ages.push(2); // age
                    } else {
                        ages.push(0)
                    }
                }
            }

           addParticles(vertices, sizes, ages);
        })
        .catch(error => console.error('Error loading data:', error)); // Error handling



}



function addParticles(vertices, sizes, ages) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('age', new THREE.Float32BufferAttribute(ages, 1));


    // Create the material and pass maximumAge to the shade
        const vertexShader = `
        uniform bool uToggleStars;
        uniform bool uToggleBurst;
        uniform bool uToggleOld;
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
            if (uToggleStars && vAge == 0.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else if (uToggleBurst && vAge == 1.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else if (uToggleOld && vAge == 2.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else {
                gl_Position = projectionMatrix * mvPosition;
            }
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
            vec3 colors[3];
            
            colors[0]  = vec3(1.0, 1.0, 1.0);
            colors[1]  = vec3(0.0, 0.0, 1.0);
            colors[2]  = vec3(1.0, 0.0, 0.0);
            
            //float normalizedAge = clamp((vAge-7.0)/3.0, 0.0, 1.0); // Normalize based on max age
            // Determine color based on normalized age
            int index = int(vAge); // Integer part
            
            vec3 starColor = colors[index];
            gl_FragColor = vec4(starColor, alpha);
        }
    `;

    // ShaderMaterial
    const toggleStarsUniform = { value: toggleStars };
    const toggleBurstUniform = { value: toggleBurst };
    const toggleOldUniform = { value: toggleOld };
    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            uToggleStars: toggleStarsUniform,
            uToggleBurst: toggleBurstUniform,
            uToggleOld: toggleOldUniform,
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

document.addEventListener('keydown', (event) => {
    if (event.key === 's') { // Assuming 't' is the key to toggle
        toggleStars = !toggleStars;

        particleSystem.material.uniforms.uToggleStars.value = toggleStars;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
    }

    if (event.key === 'b') { // Assuming 't' is the key to toggle
        toggleBurst = !toggleBurst;

        particleSystem.material.uniforms.uToggleBurst.value = toggleBurst;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
    }

    
    if (event.key === 'o') { // Assuming 't' is the key to toggle
        toggleOld = !toggleOld;

        particleSystem.material.uniforms.uToggleOld.value = toggleOld;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
    }

});
