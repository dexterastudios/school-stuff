import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

import { Octree } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/math/Octree.js';

import { Capsule } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/math/Capsule.js';

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
    modelPath: 'lowpoly__fps__tdm__game__map_by_resoforge.glb',

    // Change these after inspecting your model.
    spawnX: 0,
    spawnZ: 0,

    playerHeight: 0.4,
    playerRadius: 0.1,

    walkSpeed: 4,
    gravity: 18,
    jumpSpeed: 7,

    mouseSensitivity: 0.002
};

// ==========================================
// SCENE
// ==========================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x20232b);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

document.body.appendChild(renderer.domElement);

// ==========================================
// LIGHTING
// ==========================================

const ambientLight = new THREE.HemisphereLight(
    0xffffff,
    0x555566,
    2
);

scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffffff, 2);

sun.position.set(10, 20, 10);

scene.add(sun);

// ==========================================
// PHYSICS
// ==========================================

const worldOctree = new Octree();

const playerCollider = new Capsule(
    new THREE.Vector3(0, 0.3, 0),
    new THREE.Vector3(0, 1.4, 0),
    CONFIG.playerRadius
);

const playerVelocity = new THREE.Vector3();

const playerDirection = new THREE.Vector3();

let playerOnFloor = false;

let worldReady = false;

// ==========================================
// PLAYER
// ==========================================

let yaw = 0;
let pitch = 0;

const keys = {};

function getPlayerPosition() {
    return new THREE.Vector3(
        playerCollider.end.x,
        playerCollider.end.y + 0.15,
        playerCollider.end.z
    );
}

function updateCamera() {
    camera.position.copy(getPlayerPosition());

    camera.rotation.order = 'YXZ';

    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
}

function getForwardDirection() {
    return new THREE.Vector3(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw)
    );
}

function getSideDirection() {
    return new THREE.Vector3(
        Math.cos(yaw),
        0,
        -Math.sin(yaw)
    );
}

// ==========================================
// COLLISION
// ==========================================

function playerCollisions() {
    const result = worldOctree.capsuleIntersect(playerCollider);

    playerOnFloor = false;

    if (result) {
        playerOnFloor = result.normal.y > 0.5;

        if (!playerOnFloor) {
            playerVelocity.addScaledVector(
                result.normal,
                -result.normal.dot(playerVelocity)
            );
        }

        playerCollider.translate(
            result.normal.multiplyScalar(result.depth)
        );
    }
}

// ==========================================
// MOVEMENT
// ==========================================

function controls(delta) {
    const speed = CONFIG.walkSpeed;

    playerDirection.set(0, 0, 0);

    const forward = getForwardDirection();
    const side = getSideDirection();

    if (keys['KeyW']) {
        playerDirection.add(forward);
    }

    if (keys['KeyS']) {
        playerDirection.sub(forward);
    }

    if (keys['KeyD']) {
        playerDirection.add(side);
    }

    if (keys['KeyA']) {
        playerDirection.sub(side);
    }

    if (playerDirection.lengthSq() > 0) {
        playerDirection.normalize();

        playerVelocity.x = playerDirection.x * speed;
        playerVelocity.z = playerDirection.z * speed;
    } else {
        playerVelocity.x = 0;
        playerVelocity.z = 0;
    }

    // Gravity

    if (!playerOnFloor) {
        playerVelocity.y -= CONFIG.gravity * delta;
    }

    // Jump

    if (keys['Space'] && playerOnFloor) {
        playerVelocity.y = CONFIG.jumpSpeed;
        playerOnFloor = false;
    }

    // Move capsule

    playerCollider.translate(
        playerVelocity.clone().multiplyScalar(delta)
    );

    playerCollisions();

    // Stop falling forever if the player leaves the model.

    if (playerCollider.end.y < -50) {
        resetPlayer();
    }
}

function resetPlayer() {
    const floorY = modelBounds.min.y;

    playerCollider.start.set(
        CONFIG.spawnX,
        floorY + CONFIG.playerRadius,
        CONFIG.spawnZ
    );

    playerCollider.end.set(
        CONFIG.spawnX,
        floorY + CONFIG.playerHeight - CONFIG.playerRadius,
        CONFIG.spawnZ
    );

    playerVelocity.set(0, 0, 0);
    playerOnFloor = false;
}

// ==========================================
// KEYBOARD
// ==========================================

window.addEventListener('keydown', (event) => {
    keys[event.code] = true;

    if (
        event.code === 'Space' &&
        document.pointerLockElement
    ) {
        event.preventDefault();
    }
});

window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

window.addEventListener('blur', () => {
    for (const key in keys) {
        keys[key] = false;
    }
});

// ==========================================
// MOUSE LOOK
// ==========================================

document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== renderer.domElement) {
        return;
    }

    yaw -= event.movementX * CONFIG.mouseSensitivity;

    pitch -= event.movementY * CONFIG.mouseSensitivity;

    pitch = THREE.MathUtils.clamp(
        pitch,
        -Math.PI / 2 + 0.01,
        Math.PI / 2 - 0.01
    );
});

// ==========================================
// POINTER LOCK
// ==========================================

const startScreen = document.getElementById('start-screen');
const playButton = document.getElementById('play-button');
const hud = document.getElementById('hud');

playButton.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    const playing =
        document.pointerLockElement === renderer.domElement;

    startScreen.classList.toggle(
        'hidden',
        playing
    );

    hud.classList.toggle(
        'hidden',
        !playing
    );

    if (!playing) {
        for (const key in keys) {
            keys[key] = false;
        }
    }
});

// ==========================================
// MODEL LOADING
// ==========================================

const loader = new GLTFLoader();

const loadingScreen = document.getElementById('loading');
const errorBox = document.getElementById('error');

let modelBounds = new THREE.Box3();

loader.load(
    CONFIG.modelPath,

    (gltf) => {
        const model = gltf.scene;

        scene.add(model);

        model.updateMatrixWorld(true);

        model.traverse((object) => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;

                object.material.side = THREE.FrontSide;
            }
        });

        // Calculate actual model dimensions.

        modelBounds.setFromObject(model);

        console.log('MODEL DIMENSIONS:', {
            width: modelBounds.max.x - modelBounds.min.x,
            height: modelBounds.max.y - modelBounds.min.y,
            depth: modelBounds.max.z - modelBounds.min.z
        });

        console.log('MODEL BOUNDS:', modelBounds);

        // Generate collision octree.

        worldOctree.fromGraphNode(model);

        // Position player.

        resetPlayer();

        // Model successfully loaded.

        worldReady = true;

        loadingScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');

        console.log('Corridor loaded successfully.');
    },

    (progress) => {
        if (progress.total > 0) {
            const percentage = Math.round(
                progress.loaded / progress.total * 100
            );

            loadingScreen.querySelector('p').textContent =
                `Loading environment... ${percentage}%`;
        }
    },

    (error) => {
        console.error(error);

        errorBox.classList.remove('hidden');

        errorBox.textContent =
            'Failed to load corridor.glb. Check the model path and browser console.';
    }
);

// ==========================================
// GAME LOOP
// ==========================================

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    if (
        worldReady &&
        document.pointerLockElement === renderer.domElement
    ) {
        controls(delta);
        updateCamera();
    }

    renderer.render(scene, camera);
}

animate();

// ==========================================
// RESIZE
// ==========================================

window.addEventListener('resize', () => {
    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
});
