
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

let toggle0 = false;
let toggle1 = false;
let toggle2 = false;
let toggle3 = false;
let toggle4 = false;
let toggle5 = false;
let toggle6 = false;
let toggle7 = false;
let toggle8 = false;
let toggle9 = false;



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
                    ageNorm = Math.round(parts[6] / 1.0e9)
                    if (ageNorm > 9) {
                        ages.push(9);
                    } else {
                        ages.push(ageNorm);
                    }
                    
                }
            }
           console.log(ages)
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
        
        uniform bool uToggle0;
        uniform bool uToggle1;
        uniform bool uToggle2;
        uniform bool uToggle3;
        uniform bool uToggle4;
        uniform bool uToggle5;
        uniform bool uToggle6;
        uniform bool uToggle7;
        uniform bool uToggle8;
        uniform bool uToggle9;
        
        attribute float size;
        varying float vSize;
        attribute vec3 color; 
        attribute float age; 
        varying vec3 vColor;
        varying float vAge;

        void main() {
            vColor = color;
            vSize = size;
            vAge = age;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size;

            if (uToggle0 && vAge == 0.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else if (uToggle1 && vAge == 1.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else if (uToggle2 && vAge == 2.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else if (uToggle3 && vAge == 3.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else if (uToggle4 && vAge == 4.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else if (uToggle5 && vAge == 5.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else if (uToggle6 && vAge == 6.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else if (uToggle7 && vAge == 7.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else if (uToggle8 && vAge == 8.0) {
                gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
            } else if (uToggle9 && vAge == 9.0) {
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
            vec3 colors[10];
            
            colors[0] = vec3(0.129999503869523, 0.118998934049376, 0.954000138575591);
            colors[1] = vec3(0.229999503869523, 0.298998934049376, 0.754000138575591);
            colors[2] = vec3(0.406839975594796, 0.537716815138862, 0.934353076530895);
            colors[3] = vec3(0.602704657000925, 0.731255643849636, 0.999993037787936);
            colors[4] = vec3(0.938414189694655, 0.935877766169784, 0.939423093082902);
            colors[5] = vec3(0.930635712635114, 0.920337799431383, 0.931004577523922);
            colors[6] = vec3(0.967788492347632, 0.657029312579374, 0.537326446666784);
            colors[7] = vec3(0.887106659532162, 0.413948424491904, 0.32456448199742);
            colors[8] = vec3(0.706000135911705, 0.015991824033981, 0.1500000719222);
            colors[9] = vec3(0.96000135911705, 0.015991824033981, 0.000000719222);
            
            
            
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
    const toggle0Uniform = { value: toggle0 };
    const toggle1Uniform = { value: toggle1 };
    const toggle2Uniform = { value: toggle2 };
    const toggle3Uniform = { value: toggle3 };
    const toggle4Uniform = { value: toggle4 };
    const toggle5Uniform = { value: toggle5 };
    const toggle6Uniform = { value: toggle6 };
    const toggle7Uniform = { value: toggle7 };
    const toggle8Uniform = { value: toggle8 };
    const toggle9Uniform = { value: toggle9 };
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            uToggleStars: toggleStarsUniform,
            uToggleBurst: toggleBurstUniform,
            uToggleOld: toggleOldUniform,
            uToggle0: toggle0Uniform,
            uToggle1: toggle1Uniform,
            uToggle2: toggle2Uniform,
            uToggle3: toggle3Uniform,
            uToggle4: toggle4Uniform,
            uToggle5: toggle5Uniform,
            uToggle6: toggle6Uniform,
            uToggle7: toggle7Uniform,
            uToggle8: toggle8Uniform,
            uToggle9: toggle9Uniform,
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

    

    if (event.key === '0') {
        toggle0 = !toggle0;
        particleSystem.material.uniforms.uToggle0.value = toggle0;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
        console.log(event.key);
        console.log(1.0e9)
    }

    if (event.key === '1') {
        toggle1 = !toggle1;
        particleSystem.material.uniforms.uToggle1.value = toggle1;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
        console.log(event.key);
        console.log(1.0e9)
    }

    if (event.key === '2') {
        toggle2 = !toggle2;
        particleSystem.material.uniforms.uToggle2.value = toggle2;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
        console.log(event.key);
        console.log(1.0e9)
    }

    if (event.key === '3') {
        toggle3 = !toggle3;
        particleSystem.material.uniforms.uToggle3.value = toggle3;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
        console.log(event.key);
        console.log(1.0e9)
    }

    if (event.key === '4') {
        toggle4 = !toggle4;
        particleSystem.material.uniforms.uToggle4.value = toggle4;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
        console.log(event.key);
        console.log(1.0e9)
    }

    if (event.key === '5') {
        toggle5 = !toggle5;
        particleSystem.material.uniforms.uToggle5.value = toggle5;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
        console.log(event.key);
        console.log(1.0e9)
    }

    if (event.key === '6') {
        toggle6 = !toggle6;
        particleSystem.material.uniforms.uToggle6.value = toggle6;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
        console.log(event.key);
        console.log(1.0e9)
    }

    if (event.key === '7') {
        toggle7 = !toggle7;
        particleSystem.material.uniforms.uToggle7.value = toggle7;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
        console.log(event.key);
        console.log(1.0e9)
    }

    if (event.key === '8') {
        toggle8 = !toggle8;
        particleSystem.material.uniforms.uToggle8.value = toggle8;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
        console.log(event.key);
        console.log(1.0e9)
    }

    if (event.key === '9') {
        toggle9 = !toggle9;
        particleSystem.material.uniforms.uToggle9.value = toggle9;
        particleSystem.material.needsUpdate = true; // Mark the material as ne
        
        animate();
        console.log(event.key);
        console.log(1.0e9)
    }

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
