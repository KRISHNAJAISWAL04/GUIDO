/**
 * Blender 3D Studio - 3D Vehicle Driving & Obstacle Detection Engine.
 * Features Forward Laser Sensor Raycasting, Automatic Emergency Braking (AEB),
 * Red Alert Banners, Voice Warning Output, and Interactive Obstacle Spawning.
 */

// ---------------------------------------------------------
// Global Configuration & Knowledge Base
// ---------------------------------------------------------
const TOPICS = {
  "Admissions": "Welcome to Admissions Center. Eligibility includes 60% aggregate in Math and Science.",
  "Departments": "Engineering Hub offers Computer Science, AI, Robotics, Mechanical, and Electrical Engineering.",
  "Student Projects": "Students build autonomous electric vehicles, 3D hologram displays, and AI vision systems.",
  "Campus Tour": "Our 50-acre campus features smart classrooms, high-performance computing labs, and sports complexes.",
  "AI & Robotics": "The AI & Robotics Center features GPU clusters, ROS manipulators, and OpenCV mobile prototyping kits.",
  "Contact Us": "Reach reception at reception@dsacollege.edu or call +91-98765-43210."
};

const VOICE_KEYWORDS = {
  "admission": "Admissions", "apply": "Admissions",
  "department": "Departments", "course": "Departments",
  "project": "Student Projects", "tour": "Campus Tour",
  "ai": "AI & Robotics", "robot": "AI & Robotics",
  "contact": "Contact Us", "phone": "Contact Us"
};

// ---------------------------------------------------------
// State Variables
// ---------------------------------------------------------
let scene, camera, renderer, controls;
let carGroup, hologramFanGroup, hologramRobotGroup;
let frontWheelL, frontWheelR, rearWheelL, rearWheelR;
let carBodyMaterial, headlightLightLeft, headlightLightRight, underglowLight;

// Laser Sensor Beam
let laserLine, laserMaterial;

// Obstacles Array
let obstacles = [];

// Driving Physics Variables
let carSpeed = 0.0;
let carHeading = 0.0;
let steeringAngle = 0.0;
const MAX_SPEED = 0.6;
const MAX_REVERSE_SPEED = -0.25;
const ACCEL = 0.015;
const FRICTION = 0.008;
const STEER_RATE = 0.035;
const MAX_STEER = 0.45;

// Obstacle Avoidance AEB Variables
let isObstacleDetected = false;
let nearestObstacleDistance = 999.0;
let lastObstacleWarningTime = 0;
const EMERGENCY_STOP_DIST = 3.8; // Meters

let driveMode = "manual"; // "manual", "autopilot"
let cameraMode = "chase"; // "chase", "orbit"
let selectedObject = "Autonomous_Car";
let isTtsMuted = false;
let isDisplayActive = true;

// Visitor Simulation State
let activeVisitor = null;         // The 3D visitor group currently walking
let visitorWalkTarget = null;     // Where the visitor is walking toward
let visitorPhase = "idle";        // "idle", "approaching", "arrived", "departing"
let visitorCleanupTimer = null;   // Auto-cleanup timeout ID
let visitorBobTime = 0;           // Walking bob animation counter

const keys = {};

// Autopilot Waypoints
const waypoints = [
  { x: 0, z: 0, topic: "Campus Tour" },
  { x: 15, z: 15, topic: "Admissions" },
  { x: 0, z: -20, topic: "AI & Robotics" },
  { x: -18, z: 10, topic: "Departments" },
];
let currentWaypointIdx = 0;
let lastProximityTime = 0;

let frameCount = 0;
let lastFpsTime = performance.now();

// ---------------------------------------------------------
// Log Console Helper
// ---------------------------------------------------------
function addLog(msg) {
  const consoleEl = document.getElementById("log-console");
  if (!consoleEl) return;

  const now = new Date();
  const timeStr = now.toTimeString().split(" ")[0];
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerText = `[${timeStr}] ${msg}`;

  consoleEl.appendChild(entry);
  consoleEl.scrollTop = consoleEl.scrollHeight;

  while (consoleEl.children.length > 20) {
    consoleEl.removeChild(consoleEl.firstChild);
  }
}

// ---------------------------------------------------------
// Initialize Three.js 3D Viewport
// ---------------------------------------------------------
function init3DViewport() {
  const container = document.querySelector(".viewport-wrapper");
  const canvas = document.getElementById("three-canvas");

  const width = container.clientWidth;
  const height = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080c14);
  scene.fog = new THREE.FogExp2(0x080c14, 0.025);

  camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 150);
  camera.position.set(0, 4, 8);

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x00e6ff, 1.2);
  dirLight.position.set(12, 18, 12);
  dirLight.castShadow = true;
  scene.add(dirLight);

  buildCampusEnvironment();
  build3DCarModel();
  build3DHologramFan();
  build3DGuideAvatar();
  build3DObstacles();
  buildForwardLaserSensor();

  addLog("Three.js 3D Obstacle Detection & AEB Engine loaded.");

  window.addEventListener("resize", onWindowResize);
}

// ---------------------------------------------------------
// Build Campus Buildings & 3D Roadways
// ---------------------------------------------------------
function buildCampusEnvironment() {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x121a24, roughness: 0.8 });
  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMesh = new THREE.Mesh(groundGeo, roadMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const gridHelper = new THREE.GridHelper(100, 50, 0x00e6ff, 0x1f2e42);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  const buildings = [
    { name: "Admissions Center", pos: [15, 0, 15], color: 0x00aaff, size: [6, 4, 6] },
    { name: "Engineering Hub", pos: [-18, 0, 10], color: 0x00ff88, size: [7, 5, 8] },
    { name: "AI & Robotics Hub", pos: [0, 0, -20], color: 0xffaa00, size: [8, 6, 7] },
  ];

  buildings.forEach((b) => {
    const bGeo = new THREE.BoxGeometry(...b.size);
    const bMat = new THREE.MeshStandardMaterial({ color: b.color, metalness: 0.5, roughness: 0.3 });
    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.set(b.pos[0], b.size[1] / 2, b.pos[2]);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    scene.add(bMesh);
  });
}

// ---------------------------------------------------------
// Build 3D Car Model
// ---------------------------------------------------------
function build3DCarModel() {
  carGroup = new THREE.Group();
  carGroup.name = "Autonomous_Car";

  const bodyGeo = new THREE.BoxGeometry(2.2, 0.75, 4.2);
  carBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x0088cc,
    metalness: 0.8,
    roughness: 0.2,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, carBodyMaterial);
  bodyMesh.position.y = 0.6;
  bodyMesh.castShadow = true;
  carGroup.add(bodyMesh);

  const cabinGeo = new THREE.BoxGeometry(1.8, 0.65, 2.0);
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x00e6ff,
    metalness: 0.9,
    transparent: true,
    opacity: 0.6,
  });
  const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
  cabinMesh.position.set(0, 1.25, -0.2);
  carGroup.add(cabinMesh);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 24);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111822, metalness: 0.9 });
  wheelGeo.rotateZ(Math.PI / 2);

  frontWheelL = new THREE.Group();
  const fLMesh = new THREE.Mesh(wheelGeo, wheelMat);
  frontWheelL.add(fLMesh);
  frontWheelL.position.set(-1.2, 0.42, 1.3);
  carGroup.add(frontWheelL);

  frontWheelR = new THREE.Group();
  const fRMesh = new THREE.Mesh(wheelGeo, wheelMat);
  frontWheelR.add(fRMesh);
  frontWheelR.position.set(1.2, 0.42, 1.3);
  carGroup.add(frontWheelR);

  rearWheelL = new THREE.Mesh(wheelGeo, wheelMat);
  rearWheelL.position.set(-1.2, 0.42, -1.3);
  carGroup.add(rearWheelL);

  rearWheelR = new THREE.Mesh(wheelGeo, wheelMat);
  rearWheelR.position.set(1.2, 0.42, -1.3);
  carGroup.add(rearWheelR);

  headlightLightLeft = new THREE.SpotLight(0x00ffff, 4, 14, Math.PI / 6, 0.3);
  headlightLightLeft.position.set(-0.8, 0.7, 2.1);
  headlightLightLeft.target.position.set(-0.8, 0, 8);
  carGroup.add(headlightLightLeft);
  carGroup.add(headlightLightLeft.target);

  headlightLightRight = new THREE.SpotLight(0x00ffff, 4, 14, Math.PI / 6, 0.3);
  headlightLightRight.position.set(0.8, 0.7, 2.1);
  headlightLightRight.target.position.set(0.8, 0, 8);
  carGroup.add(headlightLightRight);
  carGroup.add(headlightLightRight.target);

  underglowLight = new THREE.PointLight(0x00e6ff, 3, 5);
  underglowLight.position.set(0, 0.1, 0);
  carGroup.add(underglowLight);

  scene.add(carGroup);
}

// ---------------------------------------------------------
// Build Forward Laser Distance Sensor Beam
// ---------------------------------------------------------
function buildForwardLaserSensor() {
  const points = [
    new THREE.Vector3(0, 0.5, 2.1),
    new THREE.Vector3(0, 0.5, 10.0),
  ];
  const laserGeo = new THREE.BufferGeometry().setFromPoints(points);
  laserMaterial = new THREE.LineBasicMaterial({ color: 0x00e6ff, linewidth: 2 });
  laserLine = new THREE.Line(laserGeo, laserMaterial);
  laserLine.name = "Laser_Sensor_Beam";
  carGroup.add(laserLine);
}

// ---------------------------------------------------------
// Build 3D Campus Roadway Obstacles
// ---------------------------------------------------------
function build3DObstacles() {
  // Traffic Cone 1
  spawnTrafficCone(6.0, 6.0);
  // Construction Barrier
  spawnBarrier(-10.0, 5.0);
  // Pedestrian Character
  spawnPedestrian(0.0, -10.0);
}

function spawnTrafficCone(x, z) {
  const coneGroup = new THREE.Group();
  coneGroup.name = "Traffic_Cone";

  const coneGeo = new THREE.ConeGeometry(0.35, 0.8, 16);
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff4400, roughness: 0.3 });
  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  coneMesh.position.y = 0.4;
  coneGroup.add(coneMesh);

  const baseGeo = new THREE.BoxGeometry(0.7, 0.1, 0.7);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.05;
  coneGroup.add(baseMesh);

  coneGroup.position.set(x, 0, z);
  scene.add(coneGroup);
  obstacles.push(coneGroup);
}

function spawnBarrier(x, z) {
  const barrierGroup = new THREE.Group();
  barrierGroup.name = "Safety_Barrier";

  const bGeo = new THREE.BoxGeometry(2.4, 0.8, 0.3);
  const bMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
  const bMesh = new THREE.Mesh(bGeo, bMat);
  bMesh.position.y = 0.4;
  barrierGroup.add(bMesh);

  barrierGroup.position.set(x, 0, z);
  scene.add(barrierGroup);
  obstacles.push(barrierGroup);
}

function spawnPedestrian(x, z) {
  const pedGroup = new THREE.Group();
  pedGroup.name = "Pedestrian_Visitor";

  const bodyGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 0.6;
  pedGroup.add(bodyMesh);

  const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.y = 1.4;
  pedGroup.add(headMesh);

  pedGroup.position.set(x, 0, z);
  scene.add(pedGroup);
  obstacles.push(pedGroup);
}

function spawnObstacleAhead() {
  const spawnDist = 6.0;
  const sx = carGroup.position.x + Math.sin(carHeading) * spawnDist;
  const sz = carGroup.position.z + Math.cos(carHeading) * spawnDist;
  spawnTrafficCone(sx, sz);
  addLog(`Spawned 3D Traffic Cone at X: ${sx.toFixed(1)}, Z: ${sz.toFixed(1)}`);
  speakText("Spawned a traffic cone obstacle in front of the vehicle.");
}

function clearAllObstacles() {
  const count = obstacles.length;
  obstacles.forEach((obs) => {
    scene.remove(obs);
    // Dispose geometries and materials to free GPU memory
    obs.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    });
  });
  obstacles = [];
  isObstacleDetected = false;

  // Reset alert banner and laser
  const alertBanner = document.getElementById("obstacle-alert-banner");
  if (alertBanner) alertBanner.classList.remove("active");
  if (laserMaterial) laserMaterial.color.setHex(0x00e6ff);
  const distValEl = document.getElementById("sensor-distance-val");
  if (distValEl) distValEl.innerText = "PATH CLEAR (>15m)";

  addLog(`Removed ${count} obstacle(s) from the scene.`);
  speakText(`Cleared ${count} obstacles. Path is now clear.`);
}

// ---------------------------------------------------------
// Build 3D Tonzo Hologram Fan Mount Rig
// ---------------------------------------------------------
function build3DHologramFan() {
  hologramFanGroup = new THREE.Group();
  hologramFanGroup.name = "Hologram_Fan_Rig";

  const baseGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.2, 16);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.8 });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.set(0, 1.7, 0);
  hologramFanGroup.add(baseMesh);

  const bladeGeo = new THREE.BoxGeometry(1.6, 0.02, 0.12);
  const bladeMat = new THREE.MeshBasicMaterial({ color: 0x00e6ff });
  const bladeMesh1 = new THREE.Mesh(bladeGeo, bladeMat);
  const bladeMesh2 = new THREE.Mesh(bladeGeo, bladeMat);
  bladeMesh2.rotation.y = Math.PI / 2;

  const bladesGroup = new THREE.Group();
  bladesGroup.position.set(0, 1.82, 0);
  bladesGroup.add(bladeMesh1);
  bladesGroup.add(bladeMesh2);

  hologramFanGroup.add(bladesGroup);
  hologramFanGroup.blades = bladesGroup;

  carGroup.add(hologramFanGroup);
}

function build3DGuideAvatar() {
  hologramRobotGroup = new THREE.Group();
  hologramRobotGroup.name = "3D_Guide_Robot";

  const robotMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });

  const headGeo = new THREE.BoxGeometry(0.5, 0.4, 0.4);
  const headMesh = new THREE.Mesh(headGeo, robotMat);
  headMesh.position.y = 3.1;
  hologramRobotGroup.add(headMesh);

  const torsoGeo = new THREE.BoxGeometry(0.7, 0.8, 0.5);
  const torsoMesh = new THREE.Mesh(torsoGeo, robotMat);
  torsoMesh.position.y = 2.3;
  hologramRobotGroup.add(torsoMesh);

  const ringGeo = new THREE.TorusGeometry(0.8, 0.02, 16, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.position.y = 1.8;
  hologramRobotGroup.add(ringMesh);

  carGroup.add(hologramRobotGroup);
}

// ---------------------------------------------------------
// Check Forward Obstacle Distance & Emergency Braking (AEB)
// ---------------------------------------------------------
function updateObstacleSensor() {
  let minForwardDist = 999.0;
  isObstacleDetected = false;

  const carPos = carGroup.position;

  obstacles.forEach((obs) => {
    const dx = obs.position.x - carPos.x;
    const dz = obs.position.z - carPos.z;
    const dist = Math.hypot(dx, dz);

    // Calculate angle relative to car heading vector
    const angleToObs = Math.atan2(dx, dz);
    let diff = angleToObs - carHeading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    // Check if obstacle is directly in front (within 45 deg cone)
    if (Math.abs(diff) < Math.PI / 4 && dist < minForwardDist) {
      minForwardDist = dist;
    }
  });

  nearestObstacleDistance = minForwardDist;
  const alertBanner = document.getElementById("obstacle-alert-banner");
  const distValEl = document.getElementById("sensor-distance-val");

  if (minForwardDist <= EMERGENCY_STOP_DIST) {
    isObstacleDetected = true;

    // 1. Cut Power & Apply Emergency Brakes
    if (carSpeed > 0) {
      carSpeed = 0; // Immediate Emergency Stop
    }

    // 2. Turn Laser Beam Red
    if (laserMaterial) laserMaterial.color.setHex(0xff3344);

    // 3. Show Red Alert Banner
    if (alertBanner) alertBanner.classList.add("active");

    // 4. Update Distance Telemetry
    if (distValEl) distValEl.innerText = `OBSTACLE DETECTED (${minForwardDist.toFixed(1)}m)`;

    // 5. Voice Warning Speech Alert
    const now = performance.now();
    if (now - lastObstacleWarningTime > 6000) {
      lastObstacleWarningTime = now;
      addLog(`⚠️ EMERGENCY STOP: Obstacle detected at ${minForwardDist.toFixed(1)}m`);
      speakText("Warning! Obstacle detected ahead. Vehicle stopped for safety.");
    }
  } else {
    // Path Clear
    if (laserMaterial) laserMaterial.color.setHex(0x00e6ff);
    if (alertBanner) alertBanner.classList.remove("active");
    if (distValEl) {
      if (minForwardDist < 15.0) distValEl.innerText = `Obstacle Ahead (${minForwardDist.toFixed(1)}m)`;
      else distValEl.innerText = "PATH CLEAR (>15m)";
    }
  }
}

// ---------------------------------------------------------
// Update Vehicle Driving Physics
// ---------------------------------------------------------
function updateVehiclePhysics() {
  updateObstacleSensor();

  if (driveMode === "manual") {
    // 1. Acceleration / Reversing Input
    if (keys["KeyW"] || keys["ArrowUp"]) {
      if (!isObstacleDetected) {
        carSpeed = Math.min(MAX_SPEED, carSpeed + ACCEL);
      } else {
        carSpeed = 0; // Prevent forward acceleration into obstacle
      }
    } else if (keys["KeyS"] || keys["ArrowDown"]) {
      // Reverse is allowed to back away from obstacle!
      carSpeed = Math.max(MAX_REVERSE_SPEED, carSpeed - ACCEL);
    } else {
      if (carSpeed > 0) carSpeed = Math.max(0, carSpeed - FRICTION);
      else if (carSpeed < 0) carSpeed = Math.min(0, carSpeed + FRICTION);
    }

    if (keys["Space"]) {
      carSpeed *= 0.65; // Responsive braking
      if (Math.abs(carSpeed) < 0.015) carSpeed = 0;
    }

    if (keys["KeyA"] || keys["ArrowLeft"]) {
      steeringAngle = Math.min(MAX_STEER, steeringAngle + 0.06);
    } else if (keys["KeyD"] || keys["ArrowRight"]) {
      steeringAngle = Math.max(-MAX_STEER, steeringAngle - 0.06);
    } else {
      steeringAngle *= 0.65;
    }
  } else if (driveMode === "autopilot") {
    if (isObstacleDetected) {
      carSpeed = 0; // Autopilot stops for obstacle
    } else {
      const target = waypoints[currentWaypointIdx];
      const dx = target.x - carGroup.position.x;
      const dz = target.z - carGroup.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 2.5) {
        currentWaypointIdx = (currentWaypointIdx + 1) % waypoints.length;
        speakText(`Arrived at ${target.topic}. ${TOPICS[target.topic]}`);
        addLog(`Autopilot arrived at: ${target.topic}`);
      } else {
        const targetAngle = Math.atan2(dx, dz);
        let angleDiff = targetAngle - carHeading;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        steeringAngle = Math.max(-MAX_STEER, Math.min(MAX_STEER, angleDiff * 2.0));
        carSpeed = Math.min(0.35, dist * 0.08);
      }
    }
  }

  if (frontWheelL && frontWheelR) {
    frontWheelL.rotation.y = steeringAngle;
    frontWheelR.rotation.y = steeringAngle;
  }

  // Responsive heading turning with low-speed assist and correct reverse turning
  if (Math.abs(carSpeed) > 0.005) {
    const steerFactor = Math.max(0.35, Math.abs(carSpeed) / MAX_SPEED);
    const dirSign = carSpeed >= 0 ? 1 : -1;
    carHeading += steeringAngle * steerFactor * 0.055 * dirSign;
  }
  carGroup.rotation.y = carHeading;

  carGroup.position.x += Math.sin(carHeading) * carSpeed;
  carGroup.position.z += Math.cos(carHeading) * carSpeed;

  const spinDelta = carSpeed * 0.6;
  if (frontWheelL && frontWheelL.children[0]) frontWheelL.children[0].rotation.x += spinDelta;
  if (frontWheelR && frontWheelR.children[0]) frontWheelR.children[0].rotation.x += spinDelta;
  if (rearWheelL) rearWheelL.rotation.x += spinDelta;
  if (rearWheelR) rearWheelR.rotation.x += spinDelta;

  const speedKmh = Math.round(Math.abs(carSpeed) * 120);
  const speedEl = document.getElementById("speed-display");
  const gearEl = document.getElementById("gear-display");

  if (speedEl) speedEl.innerText = speedKmh;
  if (gearEl) {
    if (carSpeed > 0.02) gearEl.innerText = "D";
    else if (carSpeed < -0.02) gearEl.innerText = "R";
    else gearEl.innerText = "P";
  }

  // Toggle speedometer driving animation class
  const speedoHud = document.getElementById("speedometer-container");
  if (speedoHud) {
    if (speedKmh > 0) speedoHud.classList.add("driving");
    else speedoHud.classList.remove("driving");
  }

  if (cameraMode === "chase") {
    const chaseDist = 7.5;
    const chaseHeight = 3.2;

    const targetCamX = carGroup.position.x - Math.sin(carHeading) * chaseDist;
    const targetCamZ = carGroup.position.z - Math.cos(carHeading) * chaseDist;
    const targetCamY = carGroup.position.y + chaseHeight;

    camera.position.x += (targetCamX - camera.position.x) * 0.1;
    camera.position.y += (targetCamY - camera.position.y) * 0.1;
    camera.position.z += (targetCamZ - camera.position.z) * 0.1;

    controls.target.copy(carGroup.position);
    controls.target.y += 1.0;
  }

  checkLandmarkProximity();
}

function checkLandmarkProximity() {
  const now = performance.now();
  if (now - lastProximityTime < 8000) return;

  const landmarks = [
    { name: "Admissions Center", pos: [15, 15], topic: "Admissions" },
    { name: "Engineering Hub", pos: [-18, 10], topic: "Departments" },
    { name: "AI & Robotics Hub", pos: [0, -20], topic: "AI & Robotics" },
  ];

  landmarks.forEach((lm) => {
    const dist = Math.hypot(carGroup.position.x - lm.pos[0], carGroup.position.z - lm.pos[1]);
    if (dist < 8.0) {
      lastProximityTime = now;
      addLog(`Proximity Detected: Approaching ${lm.name}`);
      speakText(`Approaching ${lm.name}. ${TOPICS[lm.topic]}`);
    }
  });
}

function initWebCam() {
  const video = document.getElementById("webcam-video");
  const canvas = document.getElementById("detection-canvas");
  const ctx = canvas.getContext("2d");

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
        addLog("WebCam Feed initialized successfully.");
      })
      .catch((err) => {
        addLog(`WebCam Warning: ${err.message}. Running in Synthetic Vision Mode.`);
      });
  }

  let synthAngle = 0;
  function processVisionFrame() {
    canvas.width = video.videoWidth || 240;
    canvas.height = video.videoHeight || 140;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    synthAngle += 0.04;
    const cx = canvas.width / 2 + Math.sin(synthAngle) * 60;
    const cy = canvas.height / 2 + Math.cos(synthAngle * 0.7) * 25;

    ctx.strokeStyle = "#00e6ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 35, cy - 35, 70, 70);

    ctx.fillStyle = "#00e6ff";
    ctx.font = "10px JetBrains Mono";
    ctx.fillText("TARGET DETECTED", cx - 35, cy - 40);

    requestAnimationFrame(processVisionFrame);
  }
  processVisionFrame();
}

function speakText(text) {
  if (isTtsMuted) return;

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  const responseEl = document.getElementById("speech-response-text");
  if (responseEl) responseEl.innerText = text;
}

function listenMicrophone() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addLog("SpeechRecognition API not supported in this browser.");
    speakText("Speech recognition is not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  addLog("Listening to microphone prompt...");
  speakText("Listening for your voice prompt...");

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    addLog(`Heard Voice Prompt: '${transcript}'`);

    let matchedTopic = null;
    for (const [key, topic] of Object.entries(VOICE_KEYWORDS)) {
      if (transcript.includes(key)) {
        matchedTopic = topic;
        break;
      }
    }

    if (matchedTopic) {
      addLog(`Matched Topic: ${matchedTopic}`);
      speakText(`You asked about ${matchedTopic}. ${TOPICS[matchedTopic]}`);
    } else {
      speakText(`I heard: ${transcript}. Ask about admissions, departments, or campus tour.`);
    }
  };

  recognition.onerror = (event) => {
    addLog(`Microphone Error: ${event.error}`);
  };

  recognition.start();
}

// ---------------------------------------------------------
// Visitor Simulation System
// ---------------------------------------------------------

function simulateVisitorApproach() {
  // If visitor already active, dismiss them
  if (activeVisitor && visitorPhase !== "idle") {
    addLog("Visitor dismissed.");
    speakText("Visitor has departed.");
    removeVisitor();
    return;
  }

  // Clean up any leftover visitor
  if (activeVisitor) removeVisitor(true);

  // 1. Spawn IN FRONT of the vehicle within camera view!
  const heading = carHeading;
  const forwardDist = 8.0;
  const lateralOffset = 1.8; // Passenger side offset
  const spawnX = carGroup.position.x + Math.sin(heading) * forwardDist + Math.cos(heading) * lateralOffset;
  const spawnZ = carGroup.position.z + Math.cos(heading) * forwardDist - Math.sin(heading) * lateralOffset;

  // 2. Build a high-visibility, friendly visitor model
  const visitorGroup = new THREE.Group();
  visitorGroup.name = "Simulated_Visitor";

  // Shoes (white sneakers)
  const shoeGeo = new THREE.BoxGeometry(0.14, 0.08, 0.22);
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(-0.12, 0.04, 0.04);
  visitorGroup.add(leftShoe);

  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0.12, 0.04, 0.04);
  visitorGroup.add(rightShoe);

  // Legs (navy jeans)
  const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.65, 12);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x203858, roughness: 0.6 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.12, 0.35, 0);
  leftLeg.name = "leftLeg";
  visitorGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.12, 0.35, 0);
  rightLeg.name = "rightLeg";
  visitorGroup.add(rightLeg);

  // Torso (bright stylish orange/gold hoodie - easily visible!)
  const bodyGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.72, 14);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.4, metalness: 0.1 });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 0.98;
  visitorGroup.add(bodyMesh);

  // Arms (orange hoodie sleeves)
  const armGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.55, 10);
  const armMat = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.4 });
  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.32, 0.95, 0);
  leftArm.name = "leftArm";
  visitorGroup.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.32, 0.95, 0);
  rightArm.name = "rightArm";
  visitorGroup.add(rightArm);

  // Head (skin tone)
  const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffd1b3, roughness: 0.6 });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.y = 1.52;
  visitorGroup.add(headMesh);

  // Hair / Cap
  const capGeo = new THREE.SphereGeometry(0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.position.y = 1.53;
  visitorGroup.add(capMesh);

  // Floating glowing visitor badge icon above head
  const badgeHaloGeo = new THREE.TorusGeometry(0.25, 0.025, 12, 24);
  const badgeHaloMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
  const badgeHalo = new THREE.Mesh(badgeHaloGeo, badgeHaloMat);
  badgeHalo.rotation.x = Math.PI / 2;
  badgeHalo.position.y = 1.95;
  badgeHalo.name = "badgeHalo";
  visitorGroup.add(badgeHalo);

  const tagLight = new THREE.PointLight(0x00ff88, 2.5, 4);
  tagLight.position.set(0, 1.95, 0);
  visitorGroup.add(tagLight);

  // Place visitor in scene (DO NOT push to obstacles array so AEB doesn't trigger!)
  visitorGroup.position.set(spawnX, 0, spawnZ);
  scene.add(visitorGroup);

  // 3. Set visitor state
  activeVisitor = visitorGroup;
  visitorPhase = "approaching";
  visitorBobTime = 0;

  // Walk target: near car window
  visitorWalkTarget = {
    x: carGroup.position.x + Math.sin(heading) * 1.5 + Math.cos(heading) * 2.2,
    z: carGroup.position.z + Math.cos(heading) * 1.5 - Math.sin(heading) * 2.2
  };

  // 4. Update UI
  updateVisitorStatusBadge("🚶 Visitor approaching vehicle...");
  const visitorBtn = document.getElementById("btn-trigger-visitor");
  if (visitorBtn) visitorBtn.innerText = "👋 DISMISS VISITOR";
  addLog(`Visitor spawned at X: ${spawnX.toFixed(1)}, Z: ${spawnZ.toFixed(1)} — walking to car window.`);
  speakText("A campus visitor is approaching your vehicle.");

  // 5. Auto cleanup after 35s if no interaction
  if (visitorCleanupTimer) clearTimeout(visitorCleanupTimer);
  visitorCleanupTimer = setTimeout(() => {
    if (activeVisitor && visitorPhase !== "idle") {
      addLog("Visitor departed after tour.");
      speakText("The visitor has completed their inquiry.");
      removeVisitor();
    }
  }, 35000);
}

function updateVisitorAnimation() {
  if (!activeVisitor || visitorPhase === "idle") return;

  visitorBobTime += 0.08;

  // Animate floating halo
  const halo = activeVisitor.getObjectByName("badgeHalo");
  if (halo) {
    halo.rotation.z += 0.04;
    halo.position.y = 1.95 + Math.sin(visitorBobTime * 1.5) * 0.04;
  }

  if (visitorPhase === "approaching") {
    // Current target: right side of the car
    const heading = carHeading;
    const targetX = carGroup.position.x + Math.sin(heading) * 1.2 + Math.cos(heading) * 2.2;
    const targetZ = carGroup.position.z + Math.cos(heading) * 1.2 - Math.sin(heading) * 2.2;

    const dx = targetX - activeVisitor.position.x;
    const dz = targetZ - activeVisitor.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.5) {
      // Walk toward car side window
      const walkSpeed = 0.07;
      const dirX = dx / dist;
      const dirZ = dz / dist;
      activeVisitor.position.x += dirX * walkSpeed;
      activeVisitor.position.z += dirZ * walkSpeed;

      // Face walking direction
      activeVisitor.rotation.y = Math.atan2(dirX, dirZ);

      // Walking bob animation
      activeVisitor.position.y = Math.abs(Math.sin(visitorBobTime * 1.2)) * 0.08;

      // Leg & Arm swinging
      activeVisitor.children.forEach((child) => {
        if (child.name === "leftLeg") {
          child.rotation.x = Math.sin(visitorBobTime * 1.5) * 0.45;
        } else if (child.name === "rightLeg") {
          child.rotation.x = Math.sin(visitorBobTime * 1.5 + Math.PI) * 0.45;
        } else if (child.name === "leftArm") {
          child.rotation.x = Math.sin(visitorBobTime * 1.5 + Math.PI) * 0.35;
        } else if (child.name === "rightArm") {
          child.rotation.x = Math.sin(visitorBobTime * 1.5) * 0.35;
        }
      });

      if (Math.floor(visitorBobTime) % 15 === 0) {
        updateVisitorStatusBadge(`🚶 Visitor approaching... (${dist.toFixed(0)}m)`);
      }
    } else {
      // Arrived at the car window!
      visitorPhase = "arrived";
      activeVisitor.position.y = 0;

      // Reset legs and arms to standing
      activeVisitor.children.forEach((child) => {
        if (child.name === "leftLeg" || child.name === "rightLeg" ||
            child.name === "leftArm" || child.name === "rightArm") {
          child.rotation.x = 0;
        }
      });

      // Face directly toward the car
      const faceAngle = Math.atan2(
        carGroup.position.x - activeVisitor.position.x,
        carGroup.position.z - activeVisitor.position.z
      );
      activeVisitor.rotation.y = faceAngle;

      // Welcome Greeting Sequence
      updateVisitorStatusBadge("👋 Visitor at window — Ask a topic!");
      addLog("Visitor has arrived at vehicle window. Awaiting topic inquiry.");
      const greetingMsg = "Hello! I'm touring DSA College today. Can you tell me about your Admissions or Student Projects?";
      
      const speechBox = document.getElementById("speech-response-text");
      if (speechBox) speechBox.innerText = `Visitor: "${greetingMsg}"`;
      speakText(greetingMsg);

      // Highlight topic buttons
      document.querySelectorAll(".btn-topic").forEach((btn) => {
        btn.style.animation = "topicHighlight 1s ease 2";
      });
      setTimeout(() => {
        document.querySelectorAll(".btn-topic").forEach((btn) => {
          btn.style.animation = "";
        });
      }, 2500);
    }
  } else if (visitorPhase === "arrived") {
    // Gentle breathing animation while waiting
    activeVisitor.position.y = Math.sin(performance.now() * 0.003) * 0.03;
  } else if (visitorPhase === "departing") {
    // Walk away from car
    const awayX = activeVisitor.position.x - carGroup.position.x;
    const awayZ = activeVisitor.position.z - carGroup.position.z;
    const awayDist = Math.hypot(awayX, awayZ);

    if (awayDist < 14) {
      const departSpeed = 0.08;
      const dirX = awayX / (awayDist || 1);
      const dirZ = awayZ / (awayDist || 1);
      activeVisitor.position.x += dirX * departSpeed;
      activeVisitor.position.z += dirZ * departSpeed;
      activeVisitor.rotation.y = Math.atan2(dirX, dirZ);

      activeVisitor.position.y = Math.abs(Math.sin(visitorBobTime * 1.2)) * 0.08;
      activeVisitor.children.forEach((child) => {
        if (child.name === "leftLeg") child.rotation.x = Math.sin(visitorBobTime * 1.5) * 0.45;
        else if (child.name === "rightLeg") child.rotation.x = Math.sin(visitorBobTime * 1.5 + Math.PI) * 0.45;
        else if (child.name === "leftArm") child.rotation.x = Math.sin(visitorBobTime * 1.5 + Math.PI) * 0.35;
        else if (child.name === "rightArm") child.rotation.x = Math.sin(visitorBobTime * 1.5) * 0.35;
      });
    } else {
      removeVisitor();
    }
  }
}

function updateVisitorStatusBadge(text) {
  const badge = document.getElementById("visitor-status-badge");
  const textEl = document.getElementById("visitor-status-text");
  if (badge && textEl) {
    badge.style.display = "flex";
    badge.classList.add("active");
    textEl.innerText = text;
  }
}

function removeVisitor(silent) {
  if (activeVisitor) {
    scene.remove(activeVisitor);
    activeVisitor.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    });
    activeVisitor = null;
  }

  visitorPhase = "idle";
  visitorWalkTarget = null;

  if (visitorCleanupTimer) {
    clearTimeout(visitorCleanupTimer);
    visitorCleanupTimer = null;
  }

  const badge = document.getElementById("visitor-status-badge");
  if (badge) {
    badge.classList.remove("active");
    badge.style.display = "none";
  }

  const visitorBtn = document.getElementById("btn-trigger-visitor");
  if (visitorBtn) visitorBtn.innerText = "🚶 SIMULATE VISITOR";

  if (!silent) {
    addLog("Visitor has departed the scene.");
  }
}

function initUIEvents() {
  window.addEventListener("keydown", (e) => { keys[e.code] = true; });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  // Sidebar Tab Switching
  const tabBtnControls = document.getElementById("tab-btn-controls");
  const tabBtnInspector = document.getElementById("tab-btn-inspector");
  const paneControls = document.getElementById("pane-controls");
  const paneInspector = document.getElementById("pane-inspector");

  tabBtnControls?.addEventListener("click", () => {
    tabBtnControls.classList.add("active");
    tabBtnInspector?.classList.remove("active");
    if (paneControls) paneControls.style.display = "flex";
    if (paneInspector) paneInspector.style.display = "none";
  });

  tabBtnInspector?.addEventListener("click", () => {
    tabBtnInspector?.classList.add("active");
    tabBtnControls?.classList.remove("active");
    if (paneControls) paneControls.style.display = "none";
    if (paneInspector) paneInspector.style.display = "flex";
  });

  // Driving Mode Buttons
  document.getElementById("mode-manual")?.addEventListener("click", () => {
    driveMode = "manual";
    document.getElementById("mode-manual").classList.add("active");
    document.getElementById("mode-autopilot").classList.remove("active");
    addLog("Driving Mode: MANUAL [WASD]");
  });

  document.getElementById("mode-autopilot")?.addEventListener("click", () => {
    driveMode = "autopilot";
    document.getElementById("mode-autopilot").classList.add("active");
    document.getElementById("mode-manual").classList.remove("active");
    addLog("Driving Mode: AUTOPILOT TOUR");
    speakText("Autopilot Tour mode activated. Navigating campus landmarks.");
  });

  document.getElementById("cam-chase")?.addEventListener("click", () => {
    cameraMode = "chase";
    addLog("Camera Mode: CHASE (Following Vehicle)");
  });

  document.getElementById("cam-orbit")?.addEventListener("click", () => {
    cameraMode = "orbit";
    addLog("Camera Mode: FREE ORBIT");
  });

  // Responsive On-Screen Drive Controls (Touch & Mouse)
  const setupDriveBtn = (id, keyName) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const press = (e) => {
      e.preventDefault();
      keys[keyName] = true;
      btn.classList.add("pressed");
    };
    const release = (e) => {
      keys[keyName] = false;
      btn.classList.remove("pressed");
    };

    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);
    btn.addEventListener("touchstart", press, { passive: false });
    btn.addEventListener("touchend", release);
    btn.addEventListener("touchcancel", release);
  };

  setupDriveBtn("btn-drive-fwd", "KeyW");
  setupDriveBtn("btn-drive-rev", "KeyS");
  setupDriveBtn("btn-drive-left", "KeyA");
  setupDriveBtn("btn-drive-right", "KeyD");
  setupDriveBtn("btn-drive-brake", "Space");

  document.getElementById("btn-spawn-obstacle")?.addEventListener("click", () => {
    spawnObstacleAhead();
  });

  document.getElementById("btn-clear-obstacles")?.addEventListener("click", () => {
    clearAllObstacles();
  });

  // Dismiss Visitor Button
  document.getElementById("btn-dismiss-visitor")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (activeVisitor) {
      addLog("Visitor dismissed by user.");
      speakText("Visitor has departed.");
      removeVisitor();
    }
  });

  document.querySelectorAll(".btn-topic").forEach((btn) => {
    btn.addEventListener("click", () => {
      const topic = btn.getAttribute("data-topic");
      if (TOPICS[topic]) {
        addLog(`Selected Topic: ${topic}`);
        speakText(TOPICS[topic]);

        // If a visitor is present and arrived, complete the interaction
        if (activeVisitor && visitorPhase === "arrived") {
          visitorPhase = "departing";
          updateVisitorStatusBadge("Visitor satisfied — departing...");
          addLog("Visitor inquiry answered. Visitor departing.");
          setTimeout(() => removeVisitor(), 3500);
        }
      }
    });
  });

  // Outliner Item Click to Select
  document.querySelectorAll(".outliner-list li").forEach((li) => {
    li.addEventListener("click", () => {
      document.querySelectorAll(".outliner-list li").forEach((el) => el.classList.remove("active"));
      li.classList.add("active");
      const objName = li.getAttribute("data-obj");
      selectedObject = objName;
      const selObjEl = document.getElementById("selected-obj-name");
      if (selObjEl) selObjEl.innerText = objName;
      addLog(`Selected Scene Object: ${objName}`);
    });
  });

  document.getElementById("color-selector")?.addEventListener("change", (e) => {
    const val = e.target.value;
    const colors = { cyan: 0x0088cc, chrome: 0xcccccc, orange: 0xff6600, stealth: 0x1a222e };
    if (carBodyMaterial && colors[val]) {
      carBodyMaterial.color.setHex(colors[val]);
      addLog(`Car Color set to: ${val.toUpperCase()}`);
    }
  });

  document.getElementById("btn-trigger-visitor")?.addEventListener("click", () => {
    simulateVisitorApproach();
  });

  document.getElementById("btn-listen-mic")?.addEventListener("click", () => {
    listenMicrophone();
  });

  document.getElementById("btn-toggle-tts")?.addEventListener("click", (e) => {
    isTtsMuted = !isTtsMuted;
    e.target.innerText = isTtsMuted ? "TTS: MUTED [T]" : "TTS: ON [T]";
    addLog(`TTS Mute: ${isTtsMuted}`);
  });

  document.getElementById("btn-toggle-power")?.addEventListener("click", (e) => {
    isDisplayActive = !isDisplayActive;
    hologramRobotGroup.visible = isDisplayActive;
    addLog(`Hologram Display Power: ${isDisplayActive ? "ONLINE" : "OFFLINE"}`);
  });
}

function onWindowResize() {
  const container = document.querySelector(".viewport-wrapper");
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  updateVehiclePhysics();

  if (cameraMode === "orbit") {
    controls.update();
  }

  if (hologramFanGroup && hologramFanGroup.blades) {
    hologramFanGroup.blades.rotation.y += 0.18;
  }

  if (hologramRobotGroup && isDisplayActive) {
    hologramRobotGroup.rotation.y += 0.018;
    hologramRobotGroup.position.y = Math.sin(performance.now() * 0.002) * 0.15;
  }

  // Update visitor walking animation
  updateVisitorAnimation();

  const posXEl = document.getElementById("pos-x");
  const posYEl = document.getElementById("pos-y");
  const posZEl = document.getElementById("pos-z");
  if (posXEl && carGroup) {
    posXEl.innerText = `X: ${carGroup.position.x.toFixed(1)}`;
    posYEl.innerText = `Y: ${carGroup.position.y.toFixed(1)}`;
    posZEl.innerText = `Z: ${carGroup.position.z.toFixed(1)}`;
  }

  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    const fps = (frameCount * 1000) / (now - lastFpsTime);
    document.getElementById("fps-counter").innerText = `FPS: ${fps.toFixed(1)}`;
    frameCount = 0;
    lastFpsTime = now;
  }

  renderer.render(scene, camera);
}

window.addEventListener("DOMContentLoaded", () => {
  init3DViewport();
  initWebCam();
  initUIEvents();
  animate();
  speakText("Obstacle detection sensor active. Drive with WASD keys or click Spawn Obstacle.");
});
