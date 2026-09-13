/**
 * Blender 3D Studio - 3D Vehicle Driving & Obstacle Detection Engine.
 * Features Forward Laser Sensor Raycasting, Automatic Emergency Braking (AEB),
 * Red Alert Banners, Voice Warning Output, and Interactive Obstacle Spawning.
 */

// ---------------------------------------------------------
// Global Configuration & Knowledge Base
// ---------------------------------------------------------
const TOPICS = {
  "Admissions": "Welcome to Admissions Center at RBMI Group of Institutions. Eligibility includes 60% aggregate in Math and Science.",
  "Student Cell": "Welcome to the Student Cell at RBMI Group of Institutions. We assist students with scholarships, academic counseling, grievance redressal, placement training, and student club activities.",
  "Departments": "Engineering Hub offers Computer Science, AI, Robotics, Mechanical, and Electrical Engineering.",
  "Student Projects": "Students build autonomous electric vehicles, 3D hologram displays, and AI vision systems.",
  "Campus Tour": "Our expansive campus features smart classrooms, high-performance computing labs, student welfare centers, and sports complexes.",
  "AI & Robotics": "The AI & Robotics Center features GPU clusters, ROS manipulators, and OpenCV mobile prototyping kits.",
  "Contact Us": "Reach reception at reception@rbmi.in or call +91-98765-43210."
};

const VOICE_KEYWORDS = {
  "admission": "Admissions", "admissions": "Admissions", "apply": "Admissions",
  "take admission": "Admissions", "want admission": "Admissions",
  "admission hub": "Admissions", "admissions hub": "Admissions", "admission center": "Admissions",
  "student cell": "Student Cell", "student": "Student Cell", "welfare": "Student Cell",
  "scholarship": "Student Cell", "cell": "Student Cell", "student support": "Student Cell",
  "department": "Departments", "course": "Departments", "engineering": "Departments",
  "project": "Student Projects", "tour": "Campus Tour", "campus": "Campus Tour",
  "ai": "AI & Robotics", "robot": "AI & Robotics", "robotics": "AI & Robotics",
  "contact": "Contact Us", "phone": "Contact Us"
};

// ---------------------------------------------------------
// Campus Navigation Destinations (45m quadrant positions)
// ---------------------------------------------------------
const CAMPUS_DESTINATIONS = {
  "Admissions": {
    name: "Admissions Center",
    x: 35.0,
    z: 35.0,
    targetHeading: Math.PI / 4,
    topic: "Admissions",
    arrivalMsg: "We have arrived at the Admissions Center! Welcome to RBMI Group of Institutions. Admissions are open for engineering, management, and technology programs. Eligibility includes 60% aggregate in Math and Science. Please proceed inside for counseling and registration."
  },
  "Student Cell": {
    name: "Student Cell",
    x: 35.0,
    z: -35.0,
    targetHeading: Math.PI * 0.75,
    topic: "Student Cell",
    arrivalMsg: "We have arrived at the Student Cell! Welcome to the Student Welfare and Support Center at RBMI Group of Institutions. We assist with scholarships, academic counseling, grievance redressal, and extracurricular student clubs. Please step inside for student services."
  },
  "Departments": {
    name: "Engineering Hub",
    x: -35.0,
    z: 35.0,
    targetHeading: -Math.PI / 4,
    topic: "Departments",
    arrivalMsg: "We have arrived at the Engineering Hub! We offer Computer Science, AI, Robotics, Mechanical, and Electrical Engineering."
  },
  "AI & Robotics": {
    name: "AI & Robotics Hub",
    x: -35.0,
    z: -35.0,
    targetHeading: -Math.PI * 0.75,
    topic: "AI & Robotics",
    arrivalMsg: "We have arrived at the AI & Robotics Hub! Here you will find GPU clusters, ROS manipulators, and OpenCV autonomous prototyping kits."
  }
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
const MAX_SPEED = 0.65;
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

let driveMode = "manual"; // "manual", "autopilot", "navigate"
let cameraMode = "chase"; // "chase", "orbit"
let selectedObject = "Autonomous_Car";
let isTtsMuted = false;
let isDisplayActive = true;

// Dedicated Navigation Target State
let targetDestination = null; // { name, x, z, topic, targetHeading, arrivalMsg }
let admissionBeacon = null;
let admissionEntranceMarker = null;
let studentCellBeacon = null;
let studentCellEntranceMarker = null;
let engineeringBeacon = null;
let engineeringEntranceMarker = null;
let aiRoboticsBeacon = null;
let aiRoboticsEntranceMarker = null;
let buildingMeshes = {};
let buildingLabels = {};

// Campus Building Directory for Real-Time Distance Monitoring (90m inter-building separation)
const CAMPUS_BUILDING_SPECS = [
  { name: "Admissions Center", topicKey: "Admissions", x: 45, z: 45, color: "#00e6ff", elId: "dist-val-admissions" },
  { name: "Student Cell", topicKey: "Student Cell", x: 45, z: -45, color: "#aa44ff", elId: "dist-val-studentcell" },
  { name: "Engineering Hub", topicKey: "Departments", x: -45, z: 45, color: "#00ff88", elId: "dist-val-engineering" },
  { name: "AI & Robotics Hub", topicKey: "AI & Robotics", x: -45, z: -45, color: "#ffaa00", elId: "dist-val-airobotics" },
];

// Visitor Simulation State
let activeVisitor = null;         // The 3D visitor group currently walking
let visitorWalkTarget = null;     // Where the visitor is walking toward
let visitorPhase = "idle";        // "idle", "approaching", "arrived", "departing"
let visitorCleanupTimer = null;   // Auto-cleanup timeout ID
let visitorBobTime = 0;           // Walking bob animation counter

const keys = {};

// Autopilot Waypoints (Expanded 90m campus perimeter tour)
const waypoints = [
  { x: 0, z: 0, topic: "Campus Tour" },
  { x: 35.0, z: 35.0, topic: "Admissions" },
  { x: 35.0, z: -35.0, topic: "Student Cell" },
  { x: -35.0, z: -35.0, topic: "AI & Robotics" },
  { x: -35.0, z: 35.0, topic: "Departments" },
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
  scene.fog = new THREE.FogExp2(0x080c14, 0.007);

  camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 350);
  camera.position.set(0, 4, 8);

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x00e6ff, 1.2);
  dirLight.position.set(30, 45, 30);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.left = -90;
  dirLight.shadow.camera.right = 90;
  dirLight.shadow.camera.top = 90;
  dirLight.shadow.camera.bottom = -90;
  dirLight.shadow.camera.far = 220;
  scene.add(dirLight);

  buildCampusEnvironment();
  build3DCarModel();
  build3DHologramFan();
  build3DGuideAvatar();
  build3DObstacles();
  buildForwardLaserSensor();

  addLog("Extended Campus Map (240m) & Student Cell initialized.");

  window.addEventListener("resize", onWindowResize);
}

// ---------------------------------------------------------
// Build Campus Buildings & Dynamic 3D Distance Labels
// ---------------------------------------------------------
function createFloatingLabel(title, colorHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(8.5, 2.65, 1);

  sprite.userData = {
    canvas,
    ctx,
    texture,
    title,
    colorHex: colorHex || "#00e6ff",
    lastDist: -1
  };

  renderLabelCanvas(sprite, 0);
  return sprite;
}

function renderLabelCanvas(sprite, distMeters) {
  const data = sprite.userData;
  if (!data) return;
  const rounded = Math.round(distMeters);
  if (data.lastDist === rounded) return;
  data.lastDist = rounded;

  const { canvas, ctx, texture, title, colorHex } = data;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Rounded pill background with glassmorphism accent
  ctx.fillStyle = "rgba(10, 18, 32, 0.90)";
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 22);
  } else {
    ctx.rect(8, 8, canvas.width - 16, canvas.height - 16);
  }
  ctx.fill();
  ctx.stroke();

  // Title text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, canvas.width / 2, 50);

  // Live Distance text badge
  ctx.fillStyle = colorHex;
  ctx.font = "bold 26px 'JetBrains Mono', Consolas, monospace";
  ctx.fillText(`📍 ${rounded}m AWAY`, canvas.width / 2, 110);

  texture.needsUpdate = true;
}

function updateCampusDistances() {
  if (!carGroup) return;

  CAMPUS_BUILDING_SPECS.forEach((b) => {
    const dist = Math.hypot(carGroup.position.x - b.x, carGroup.position.z - b.z);
    // Update 3D floating sprite label
    const sprite = buildingLabels[b.name];
    if (sprite) {
      renderLabelCanvas(sprite, dist);
    }
    // Update Sidebar UI distance badge
    const el = document.getElementById(b.elId);
    if (el) {
      el.innerText = `${Math.round(dist)} m`;
    }
  });
}

function createWayfindingSign(text, colorHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 70;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(10, 20, 36, 0.92)";
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(4, 4, 392, 62, 12);
  else ctx.rect(4, 4, 392, 62);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colorHex;
  ctx.font = "bold 24px 'JetBrains Mono', Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 200, 35);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.8, 0.49, 1);
  return sprite;
}

// ---------------------------------------------------------
// Build Campus Buildings, Extended Map & 3D Roadways
// ---------------------------------------------------------
function buildCampusEnvironment() {
  const terrainMat = new THREE.MeshStandardMaterial({ color: 0x0c121d, roughness: 0.9 });
  const groundGeo = new THREE.PlaneGeometry(240, 240);
  const groundMesh = new THREE.Mesh(groundGeo, terrainMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Extended cyber grid
  const gridHelper = new THREE.GridHelper(240, 60, 0x00e6ff, 0x162232);
  gridHelper.position.y = 0.005;
  scene.add(gridHelper);

  // Paved Main Road Material
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x141c29, roughness: 0.8 });

  // Main North-South Boulevard (Z-axis, 230m long)
  const nsRoadGeo = new THREE.PlaneGeometry(10, 230);
  const nsRoad = new THREE.Mesh(nsRoadGeo, roadMat);
  nsRoad.rotation.x = -Math.PI / 2;
  nsRoad.position.set(0, 0.012, 0);
  nsRoad.receiveShadow = true;
  scene.add(nsRoad);

  // Main East-West Boulevard (X-axis, 230m long)
  const ewRoadGeo = new THREE.PlaneGeometry(230, 10);
  const ewRoad = new THREE.Mesh(ewRoadGeo, roadMat);
  ewRoad.rotation.x = -Math.PI / 2;
  ewRoad.position.set(0, 0.012, 0);
  ewRoad.receiveShadow = true;
  scene.add(ewRoad);

  // Central Campus Roundabout Plaza at (0, 0)
  const plazaGeo = new THREE.CylinderGeometry(14, 14, 0.02, 36);
  const plazaMesh = new THREE.Mesh(plazaGeo, roadMat);
  plazaMesh.position.set(0, 0.015, 0);
  scene.add(plazaMesh);

  // Central Cyan Cyber Fountain Ring
  const centerRingGeo = new THREE.TorusGeometry(3.8, 0.14, 16, 32);
  const centerRingMat = new THREE.MeshBasicMaterial({ color: 0x00e6ff });
  const centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
  centerRing.rotation.x = Math.PI / 2;
  centerRing.position.set(0, 0.06, 0);
  scene.add(centerRing);

  // Diagonal Branch Avenues connecting Roundabout to the 4 Distanced Hubs
  const makeBranch = (x, z, w, l, rot) => {
    const bGeo = new THREE.PlaneGeometry(w, l);
    const bMesh = new THREE.Mesh(bGeo, roadMat);
    bMesh.rotation.x = -Math.PI / 2;
    bMesh.rotation.z = rot || 0;
    bMesh.position.set(x, 0.014, z);
    bMesh.receiveShadow = true;
    scene.add(bMesh);
  };
  makeBranch(20, 20, 8, 44, Math.PI / 4);     // Avenue to Admissions Center (64m out)
  makeBranch(20, -20, 8, 44, -Math.PI / 4);  // Avenue to Student Cell (64m out)
  makeBranch(-20, 20, 8, 44, -Math.PI / 4);  // Avenue to Engineering Hub (64m out)
  makeBranch(-20, -20, 8, 44, Math.PI / 4);  // Avenue to AI & Robotics (64m out)

  // Outer Campus Perimeter Ring Roads (Exact 90m direct inter-building connections)
  const makeRingRoad = (x, z, w, l) => {
    const rGeo = new THREE.PlaneGeometry(w, l);
    const rMesh = new THREE.Mesh(rGeo, roadMat);
    rMesh.rotation.x = -Math.PI / 2;
    rMesh.position.set(x, 0.013, z);
    rMesh.receiveShadow = true;
    scene.add(rMesh);
  };
  makeRingRoad(0, 45, 90, 8);   // North Avenue (Engineering <-> Admissions: 90m)
  makeRingRoad(0, -45, 90, 8);  // South Avenue (AI Robotics <-> Student Cell: 90m)
  makeRingRoad(45, 0, 8, 90);   // East Avenue (Student Cell <-> Admissions: 90m)
  makeRingRoad(-45, 0, 8, 90);  // West Avenue (AI Robotics <-> Engineering: 90m)

  // ---------------------------------------------------------
  // Central Roundabout Wayfinding Totem (Distance Directory)
  // ---------------------------------------------------------
  const totemGroup = new THREE.Group();
  totemGroup.name = "Wayfinding_Directory_Totem";

  const poleGeo = new THREE.CylinderGeometry(0.35, 0.45, 5.0, 16);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1a2638, metalness: 0.8, roughness: 0.2 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 2.5;
  totemGroup.add(pole);

  [-0.8, 0.2, 1.2].forEach((offsetY) => {
    const rGeo = new THREE.TorusGeometry(0.48, 0.05, 12, 24);
    const rMat = new THREE.MeshBasicMaterial({ color: 0x00e6ff });
    const rMesh = new THREE.Mesh(rGeo, rMat);
    rMesh.rotation.x = Math.PI / 2;
    rMesh.position.y = 2.5 + offsetY;
    totemGroup.add(rMesh);
  });

  const signs = [
    { text: "↗ ADMISSIONS • 64m", color: "#00e6ff", rotY: -Math.PI / 4, posY: 4.2 },
    { text: "↘ STUDENT CELL • 64m", color: "#aa44ff", rotY: -Math.PI * 0.75, posY: 3.7 },
    { text: "↖ ENGINEERING • 64m", color: "#00ff88", rotY: Math.PI / 4, posY: 3.2 },
    { text: "↙ AI & ROBOTICS • 64m", color: "#ffaa00", rotY: Math.PI * 0.75, posY: 2.7 }
  ];

  signs.forEach((s) => {
    const armGeo = new THREE.BoxGeometry(2.4, 0.35, 0.08);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x111c2a });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(1.2, s.posY, 0);

    const signLabel = createWayfindingSign(s.text, s.color);
    signLabel.position.set(1.2, s.posY + 0.02, 0.06);

    const signArmGroup = new THREE.Group();
    signArmGroup.rotation.y = s.rotY;
    signArmGroup.add(arm);
    signArmGroup.add(signLabel);
    totemGroup.add(signArmGroup);
  });
  scene.add(totemGroup);

  // ---------------------------------------------------------
  // Campus Buildings (45m Quadrants: 90m Spacing)
  // ---------------------------------------------------------
  const buildings = [
    { name: "Admissions Center", label: "🎓 Admissions Center", pos: [45, 0, 45], color: 0x00aaff, size: [10, 7, 10] },
    { name: "Student Cell", label: "📋 Student Cell", pos: [45, 0, -45], color: 0xaa44ff, size: [10, 7, 10] },
    { name: "Engineering Hub", label: "🏫 Engineering Hub", pos: [-45, 0, 45], color: 0x00ff88, size: [11, 7, 11] },
    { name: "AI & Robotics Hub", label: "🤖 AI & Robotics Hub", pos: [-45, 0, -45], color: 0xffaa00, size: [11, 7, 11] },
  ];

  buildings.forEach((b) => {
    const bGeo = new THREE.BoxGeometry(...b.size);
    const bMat = new THREE.MeshStandardMaterial({ color: b.color, metalness: 0.5, roughness: 0.3 });
    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.name = b.name;
    bMesh.position.set(b.pos[0], b.size[1] / 2, b.pos[2]);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    scene.add(bMesh);
    buildingMeshes[b.name] = bMesh;

    // Dynamic 3D floating text label sprite with live distance
    const labelSprite = createFloatingLabel(b.label, "#" + b.color.toString(16).padStart(6, "0"));
    labelSprite.position.set(b.pos[0], b.size[1] + 3.2, b.pos[2]);
    scene.add(labelSprite);
    buildingLabels[b.name] = labelSprite;
  });

  // Helper to create entrance parking pad and beacon
  const createEntranceStation = (x, z, colorHex, name) => {
    const padGeo = new THREE.CylinderGeometry(2.8, 2.8, 0.05, 32);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x0a2238,
      metalness: 0.8,
      roughness: 0.2,
      emissive: colorHex,
      emissiveIntensity: 0.3
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(x, 0.025, z);
    scene.add(pad);

    const ringGeo = new THREE.RingGeometry(2.7, 3.1, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.035, z);
    scene.add(ring);

    const beaconGeo = new THREE.CylinderGeometry(0.8, 2.0, 24, 24, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.name = `${name}_Beacon`;
    beacon.position.set(x, 12, z);
    beacon.visible = false;
    scene.add(beacon);

    return { pad, beacon };
  };

  // Entrance Stations (Admissions, Student Cell, Engineering, AI & Robotics)
  const admStation = createEntranceStation(35.0, 35.0, 0x00e6ff, "Admissions");
  admissionEntranceMarker = admStation.pad;
  admissionBeacon = admStation.beacon;

  const scStation = createEntranceStation(35.0, -35.0, 0xaa44ff, "Student_Cell");
  studentCellEntranceMarker = scStation.pad;
  studentCellBeacon = scStation.beacon;

  const engStation = createEntranceStation(-35.0, 35.0, 0x00ff88, "Engineering");
  engineeringEntranceMarker = engStation.pad;
  engineeringBeacon = engStation.beacon;

  const aiStation = createEntranceStation(-35.0, -35.0, 0xffaa00, "AI_Robotics");
  aiRoboticsEntranceMarker = aiStation.pad;
  aiRoboticsBeacon = aiStation.beacon;

  // Outer Campus Perimeter Light Posts along +/- 115
  const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.5, 12);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.8 });
  const tipGeo = new THREE.SphereGeometry(0.25, 12, 12);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0x00e6ff });

  for (let p = -110; p <= 110; p += 40) {
    [-115, 115].forEach((borderX) => {
      const pMesh = new THREE.Mesh(postGeo, postMat);
      pMesh.position.set(borderX, 1.75, p);
      const tMesh = new THREE.Mesh(tipGeo, tipMat);
      tMesh.position.set(borderX, 3.5, p);
      scene.add(pMesh);
      scene.add(tMesh);
    });
    [-115, 115].forEach((borderZ) => {
      const pMesh = new THREE.Mesh(postGeo, postMat);
      pMesh.position.set(p, 1.75, borderZ);
      const tMesh = new THREE.Mesh(tipGeo, tipMat);
      tMesh.position.set(p, 3.5, borderZ);
      scene.add(pMesh);
      scene.add(tMesh);
    });
  }
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
  // Traffic Cone 1 (placed on roadside for sensor testing)
  spawnTrafficCone(5.0, 3.0);
  // Construction Barrier
  spawnBarrier(-10.0, 5.0);
  // Pedestrian Character (roadside sidewalk)
  spawnPedestrian(6.0, -10.0);
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
  } else if (driveMode === "navigate") {
    if (isObstacleDetected) {
      carSpeed = 0; // AEB safety stop during navigation
      updateNavStatusUI(`⚠️ Stopped: Obstacle ahead on route to ${targetDestination ? targetDestination.name : "destination"}`);
    } else if (targetDestination) {
      const dx = targetDestination.x - carGroup.position.x;
      const dz = targetDestination.z - carGroup.position.z;
      const dist = Math.hypot(dx, dz);

      updateNavStatusUI(`🚗 Moving to ${targetDestination.name} (${dist.toFixed(1)}m remaining)`);

      if (dist < 2.2) {
        // Arrived at destination! Guaranteed complete stop
        carSpeed = 0;
        steeringAngle = 0;
        carGroup.position.x = targetDestination.x;
        carGroup.position.z = targetDestination.z;

        if (targetDestination.targetHeading !== undefined) {
          carHeading = targetDestination.targetHeading;
          carGroup.rotation.y = carHeading;
        }

        const destInfo = targetDestination;
        driveMode = "manual";
        targetDestination = null;

        if (admissionBeacon) admissionBeacon.visible = false;
        if (studentCellBeacon) studentCellBeacon.visible = false;
        hideNavStatusUI();

        const arrivalSpeech = destInfo.arrivalMsg || `Arrived at ${destInfo.name}. ${TOPICS[destInfo.topic] || ""}`;
        speakText(arrivalSpeech);
        addLog(`📍 Arrived at ${destInfo.name}! Navigation completed.`);

        const speechBox = document.getElementById("speech-response-text");
        if (speechBox) speechBox.innerText = arrivalSpeech;

        triggerArrivalEffect(destInfo.name);

        document.getElementById("mode-manual")?.classList.add("active");
        document.getElementById("mode-autopilot")?.classList.remove("active");
      } else {
        const targetAngle = Math.atan2(dx, dz);
        let angleDiff = targetAngle - carHeading;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        steeringAngle = Math.max(-MAX_STEER, Math.min(MAX_STEER, angleDiff * 2.2));

        // Smooth direct heading alignment toward target
        const turnSpeed = Math.min(Math.abs(angleDiff), 0.08);
        carHeading += Math.sign(angleDiff) * turnSpeed;

        // Speed control: high-speed long-distance cruise & arrival easing
        let cruiseSpeed = 0.50;
        if (dist <= 25 && dist > 10) {
          cruiseSpeed = 0.35;
        }
        if (Math.abs(angleDiff) > 0.5) {
          cruiseSpeed = 0.16;
        }
        if (dist <= 10.0) {
          cruiseSpeed = Math.min(cruiseSpeed, Math.max(0.06, dist * 0.045));
        }

        if (carSpeed < cruiseSpeed) {
          carSpeed = Math.min(cruiseSpeed, carSpeed + ACCEL);
        } else if (carSpeed > cruiseSpeed) {
          carSpeed = Math.max(cruiseSpeed, carSpeed - FRICTION * 3);
        }
      }
    } else {
      driveMode = "manual";
    }
  }

  if (frontWheelL && frontWheelR) {
    frontWheelL.rotation.y = steeringAngle;
    frontWheelR.rotation.y = steeringAngle;
  }

  // Only apply manual steering yaw when in manual drive mode
  if (driveMode === "manual" && Math.abs(carSpeed) > 0.005) {
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
  if (driveMode === "navigate") return; // Never interrupt active navigation!

  const now = performance.now();
  if (now - lastProximityTime < 8000) return;

  const landmarks = [
    { name: "Admissions Center", pos: [45, 45], topic: "Admissions" },
    { name: "Student Cell", pos: [45, -45], topic: "Student Cell" },
    { name: "Engineering Hub", pos: [-45, 45], topic: "Departments" },
    { name: "AI & Robotics Hub", pos: [-45, -45], topic: "AI & Robotics" },
  ];

  landmarks.forEach((lm) => {
    const dist = Math.hypot(carGroup.position.x - lm.pos[0], carGroup.position.z - lm.pos[1]);
    if (dist < 14.0) {
      lastProximityTime = now;
      addLog(`Proximity Detected: Approaching ${lm.name} (${Math.round(dist)}m)`);
      speakText(`Approaching ${lm.name}. ${TOPICS[lm.topic]}`);
    }
  });
}

function speakText(text, onEndCallback) {
  const responseEl = document.getElementById("speech-response-text");
  if (responseEl) responseEl.innerText = text;

  if (isTtsMuted) {
    if (typeof onEndCallback === "function") {
      setTimeout(onEndCallback, 250);
    }
    return;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    let callbackCalled = false;
    const finish = () => {
      if (!callbackCalled && typeof onEndCallback === "function") {
        callbackCalled = true;
        onEndCallback();
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    // Safety fallback timer in case speech synthesis event is delayed
    if (typeof onEndCallback === "function") {
      const approxDuration = Math.max(1200, (text.split(" ").length / 2.5) * 1000 + 400);
      setTimeout(finish, approxDuration);
    }

    window.speechSynthesis.speak(utterance);
  } else {
    if (typeof onEndCallback === "function") {
      setTimeout(onEndCallback, 400);
    }
  }
}

// ---------------------------------------------------------
// Autonomous Campus Navigation System
// ---------------------------------------------------------

function navigateToDestination(destKey) {
  const dest = typeof destKey === "string" ? CAMPUS_DESTINATIONS[destKey] : destKey;
  if (!dest) {
    addLog(`Unknown destination: ${destKey}`);
    return;
  }

  targetDestination = dest;
  driveMode = "navigate";

  // Light up the beacon corresponding to the destination
  if (admissionBeacon) admissionBeacon.visible = (dest.topic === "Admissions");
  if (studentCellBeacon) studentCellBeacon.visible = (dest.topic === "Student Cell");
  if (engineeringBeacon) engineeringBeacon.visible = (dest.topic === "Departments");
  if (aiRoboticsBeacon) aiRoboticsBeacon.visible = (dest.topic === "AI & Robotics");

  // Update UI driving mode buttons
  document.getElementById("mode-manual")?.classList.remove("active");
  document.getElementById("mode-autopilot")?.classList.remove("active");

  const dist = Math.hypot(dest.x - carGroup.position.x, dest.z - carGroup.position.z);
  const startMsg = `Navigating to ${dest.name}. Distance is ${Math.round(dist)} meters. Please follow me.`;
  speakText(startMsg);
  addLog(`🧭 Autonomous Navigation Initiated: Moving to '${dest.name}' at (${dest.x}, ${dest.z}), Distance: ${Math.round(dist)}m`);

  const speechBox = document.getElementById("speech-response-text");
  if (speechBox) speechBox.innerText = `Vehicle: "Navigating to ${dest.name} (${Math.round(dist)}m)..."`;

  showNavStatusUI(dest.name);
}

function cancelNavigation() {
  if (driveMode === "navigate" || targetDestination) {
    driveMode = "manual";
    targetDestination = null;
    if (admissionBeacon) admissionBeacon.visible = false;
    if (studentCellBeacon) studentCellBeacon.visible = false;
    if (engineeringBeacon) engineeringBeacon.visible = false;
    if (aiRoboticsBeacon) aiRoboticsBeacon.visible = false;
    hideNavStatusUI();
    carSpeed = 0;
    steeringAngle = 0;
    addLog("Navigation canceled by user. Manual drive restored.");
    speakText("Navigation canceled. Returning to manual control.");
    document.getElementById("mode-manual")?.classList.add("active");
  }
}

function showNavStatusUI(destinationName) {
  const badge = document.getElementById("nav-status-badge");
  const textEl = document.getElementById("nav-status-text");
  if (badge && textEl) {
    badge.style.display = "flex";
    textEl.innerText = `🚗 Navigating to ${destinationName}...`;
  }
}

function updateNavStatusUI(text) {
  const textEl = document.getElementById("nav-status-text");
  if (textEl) textEl.innerText = text;
}

function hideNavStatusUI() {
  const badge = document.getElementById("nav-status-badge");
  if (badge) badge.style.display = "none";
}

function triggerArrivalEffect(buildingName) {
  const mesh = buildingMeshes[buildingName];
  if (mesh && mesh.material) {
    mesh.material.emissive.setHex(0x00ffff);
    let flashCount = 0;
    const interval = setInterval(() => {
      flashCount++;
      if (flashCount % 2 === 1) {
        mesh.material.emissive.setHex(0x0088cc);
      } else {
        mesh.material.emissive.setHex(0x00ffff);
      }
      if (flashCount > 6) {
        clearInterval(interval);
        mesh.material.emissive.setHex(0x000000);
      }
    }, 350);
  }
}

function processVoiceCommand(rawTranscript) {
  if (!rawTranscript || typeof rawTranscript !== "string") return;
  const transcript = rawTranscript.toLowerCase().trim();
  addLog(`Processing Voice Command: '${rawTranscript}'`);

  const speechBox = document.getElementById("speech-response-text");
  if (speechBox) speechBox.innerText = `Heard: "${rawTranscript}"`;

  // 0. Check for DISTANCE query:
  if (
    transcript.includes("distance") ||
    transcript.includes("how far") ||
    transcript.includes("between buildings") ||
    transcript.includes("building distance")
  ) {
    const distAdm = Math.round(Math.hypot(carGroup.position.x - 45, carGroup.position.z - 45));
    const distCell = Math.round(Math.hypot(carGroup.position.x - 45, carGroup.position.z - (-45)));
    const distEng = Math.round(Math.hypot(carGroup.position.x - (-45), carGroup.position.z - 45));
    const distAI = Math.round(Math.hypot(carGroup.position.x - (-45), carGroup.position.z - (-45)));

    const distSpeech = `The campus buildings are 90 meters apart from each other. From your current vehicle position: Admissions Center is ${distAdm} meters, Student Cell is ${distCell} meters, Engineering Hub is ${distEng} meters, and AI Robotics Hub is ${distAI} meters away.`;
    speakText(distSpeech);
    addLog(`📏 Spoke Campus Distances: Adm=${distAdm}m, Cell=${distCell}m, Eng=${distEng}m, AI=${distAI}m`);
    return;
  }

  // 1. Check for ADMISSION navigation intent:
  // Triggered when user says "i want to take admission", "take admission", "admission center", "admission hub", etc.
  const isAdmissionNav = (
    transcript.includes("take admission") ||
    transcript.includes("want to take admission") ||
    transcript.includes("want admission") ||
    transcript.includes("get admission") ||
    transcript.includes("apply for admission") ||
    transcript.includes("go to admission") ||
    transcript.includes("move to admission") ||
    transcript.includes("take me to admission") ||
    transcript.includes("admission center") ||
    transcript.includes("admission hub") ||
    transcript.includes("admissions hub") ||
    transcript.includes("admission cell") ||
    transcript.includes("where is admission") ||
    transcript.includes("admission") ||
    transcript.includes("admissions") ||
    transcript.includes("apply")
  );

  // 1b. Check for STUDENT CELL navigation intent:
  const isStudentCellNav = (
    transcript.includes("student cell") ||
    transcript.includes("students cell") ||
    transcript.includes("student hub") ||
    transcript.includes("students hub") ||
    transcript.includes("go to student") ||
    transcript.includes("move to student") ||
    transcript.includes("take me to student") ||
    transcript.includes("student welfare") ||
    transcript.includes("scholarship cell") ||
    transcript.includes("scholarships cell") ||
    transcript.includes("scholarship") ||
    transcript.includes("scholarships")
  );

  // If a visitor is at the window, complete the interaction and have them depart
  if (activeVisitor && visitorPhase === "arrived") {
    visitorPhase = "departing";
    updateVisitorStatusBadge("Visitor satisfied — departing...");
    addLog("Visitor inquiry answered via voice. Visitor departing.");
    setTimeout(() => removeVisitor(), 3500);
  }

  if (isAdmissionNav) {
    addLog("🎙️ Voice Command Matched: 'Take Admission / Admission Hub' -> Moving car to Admissions Center!");
    navigateToDestination("Admissions");
    return;
  }

  if (isStudentCellNav) {
    addLog("🎙️ Voice Command Matched: 'Student Cell' -> Moving car to Student Cell!");
    navigateToDestination("Student Cell");
    return;
  }

  // 2. Check for other departments or AI & Robotics navigation
  if (transcript.includes("department") || transcript.includes("engineering") || transcript.includes("course")) {
    navigateToDestination("Departments");
    return;
  }
  if (transcript.includes("robot") || transcript.includes("ai") || transcript.includes("robotics")) {
    navigateToDestination("AI & Robotics");
    return;
  }

  // 3. Check for campus tour
  if (transcript.includes("tour") || transcript.includes("campus tour")) {
    driveMode = "autopilot";
    document.getElementById("mode-autopilot")?.classList.add("active");
    document.getElementById("mode-manual")?.classList.remove("active");
    speakText("Autopilot Tour mode activated. Navigating campus landmarks.");
    addLog("Autopilot Tour mode activated via voice command.");
    return;
  }

  // 4. Fallback topic search
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
    speakText(`I heard: ${rawTranscript}. Say 'I want to take admission' to drive to Admissions, or ask about departments.`);
  }
}

function listenMicrophone(announce = false) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addLog("SpeechRecognition API not supported in this browser. Please use the quick prompt buttons or voice input below.");
    if (announce) {
      speakText("Speech recognition is not supported in this browser. You can use the voice command bar or quick buttons.");
    }
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  addLog("🎤 Microphone listening for command... (Speak now)");
  if (announce) {
    speakText("Listening. Please say your prompt, such as 'I want to take admission'.");
  }

  const micBtn = document.getElementById("btn-listen-mic");
  if (micBtn) micBtn.classList.add("active");

  recognition.onresult = (event) => {
    if (micBtn) micBtn.classList.remove("active");
    const transcript = event.results[0][0].transcript;
    processVoiceCommand(transcript);
  };

  recognition.onerror = (event) => {
    if (micBtn) micBtn.classList.remove("active");
    addLog(`Microphone Status: ${event.error}`);
  };

  recognition.onend = () => {
    if (micBtn) micBtn.classList.remove("active");
  };

  try {
    recognition.start();
  } catch (err) {
    addLog(`Mic Start Notice: ${err.message}`);
  }
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
      updateVisitorStatusBadge("👋 Visitor at window — Greeting visitor...");
      addLog("Visitor arrived at vehicle window. Guide: 'Hello! Welcome to RBMI Group of Institutions. How can I help you today?'");
      const greetingMsg = "Hello! Welcome to RBMI Group of Institutions. How can I help you today?";
      
      const speechBox = document.getElementById("speech-response-text");
      if (speechBox) speechBox.innerText = `Guide: "${greetingMsg}"`;

      // Highlight topic buttons for visual suggestion
      document.querySelectorAll(".btn-topic").forEach((btn) => {
        btn.style.animation = "topicHighlight 1s ease 2";
      });
      setTimeout(() => {
        document.querySelectorAll(".btn-topic").forEach((btn) => {
          btn.style.animation = "";
        });
      }, 2500);

      // Greet the visitor, ask 'How can I help you?', and immediately open the microphone for command!
      speakText(greetingMsg, () => {
        if (activeVisitor && visitorPhase === "arrived") {
          updateVisitorStatusBadge("👋 Visitor at window — 🎤 Listening for voice command...");
          addLog("🎙️ Guide asked: 'How can I help you?' -> Opening microphone for command...");
          listenMicrophone(false);
        }
      });
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
  window.addEventListener("keydown", (e) => {
    const tag = e.target.tagName ? e.target.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea") {
      if (e.code === "Enter" && e.target.id === "voice-cmd-input") {
        document.getElementById("btn-voice-send")?.click();
      }
      return;
    }

    keys[e.code] = true;

    // Keyboard Shortcuts
    if (e.code === "KeyM") {
      e.preventDefault();
      listenMicrophone();
    } else if (e.code === "KeyC") {
      cameraMode = cameraMode === "chase" ? "orbit" : "chase";
      addLog(`Camera Mode: ${cameraMode.toUpperCase()}`);
    } else if (e.code === "KeyT") {
      document.getElementById("btn-toggle-tts")?.click();
    } else if (e.code === "KeyH") {
      document.getElementById("btn-toggle-power")?.click();
    }
  });

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
    cancelNavigation();
    driveMode = "manual";
    document.getElementById("mode-manual").classList.add("active");
    document.getElementById("mode-autopilot").classList.remove("active");
    addLog("Driving Mode: MANUAL [WASD]");
  });

  document.getElementById("mode-autopilot")?.addEventListener("click", () => {
    cancelNavigation();
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

  document.getElementById("btn-toggle-cam")?.addEventListener("click", () => {
    cameraMode = cameraMode === "chase" ? "orbit" : "chase";
    addLog(`Camera Mode: ${cameraMode.toUpperCase()}`);
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

  // Cancel Navigation Button
  document.getElementById("btn-cancel-nav")?.addEventListener("click", (e) => {
    e.stopPropagation();
    cancelNavigation();
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

  // Topic Buttons
  document.querySelectorAll(".btn-topic").forEach((btn) => {
    btn.addEventListener("click", () => {
      const topic = btn.getAttribute("data-topic");
      if (TOPICS[topic]) {
        addLog(`Selected Topic: ${topic}`);
        if (topic === "Admissions") {
          navigateToDestination("Admissions");
        } else if (topic === "Student Cell") {
          navigateToDestination("Student Cell");
        } else {
          speakText(TOPICS[topic]);
        }

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

      if (objName === "Admissions_Building") {
        navigateToDestination("Admissions");
      } else if (objName === "Student_Cell") {
        navigateToDestination("Student Cell");
      } else if (objName === "Engineering_Hub") {
        navigateToDestination("Departments");
      } else if (objName === "AI_Robotics_Center") {
        navigateToDestination("AI & Robotics");
      }
    });
  });

  // Mini-Nav Buttons in Campus Distance Monitor
  document.querySelectorAll(".btn-mini-nav").forEach((btn) => {
    btn.addEventListener("click", () => {
      const navTarget = btn.getAttribute("data-nav");
      if (navTarget && CAMPUS_DESTINATIONS[navTarget]) {
        navigateToDestination(navTarget);
      }
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

  // Voice Command Prompt Bar & Quick Chips
  const voiceInput = document.getElementById("voice-cmd-input");
  const voiceSendBtn = document.getElementById("btn-voice-send");
  voiceSendBtn?.addEventListener("click", () => {
    if (!voiceInput) return;
    const text = voiceInput.value.trim();
    if (text) {
      processVoiceCommand(text);
      voiceInput.value = "";
    }
  });

  document.querySelectorAll(".chip-btn").forEach((chip) => {
    chip.addEventListener("click", () => {
      const cmd = chip.getAttribute("data-cmd");
      if (cmd) {
        processVoiceCommand(cmd);
      }
    });
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

  // Animate glowing beacons for all 4 buildings
  [admissionBeacon, studentCellBeacon, engineeringBeacon, aiRoboticsBeacon].forEach((b) => {
    if (b && b.visible) {
      b.rotation.y += 0.02;
      if (b.material) {
        b.material.opacity = 0.35 + Math.sin(performance.now() * 0.006) * 0.18;
      }
    }
  });

  // Real-time dynamic distance updates on 3D labels and UI
  if (frameCount % 6 === 0) {
    updateCampusDistances();
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
  initUIEvents();
  animate();
  speakText("Obstacle detection sensor active. Drive with WASD keys or click Spawn Obstacle.");
});
