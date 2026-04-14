import * as THREE from 'https://esm.sh/three@0.183.0';
import { OrbitControls } from 'https://esm.sh/three@0.183.0/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef2f7);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, -95, 90);
camera.up.set(0, 0, 1);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.minDistance = 40;
controls.maxDistance = 220;
controls.update();

const ambient = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(50, -40, 80);
scene.add(dirLight);

const grid = new THREE.GridHelper(180, 18, 0x94a3b8, 0xcbd5e1);
grid.rotation.x = Math.PI / 2;
scene.add(grid);

const axes = new THREE.AxesHelper(40);
scene.add(axes);

let islandGroup = null;
let autoSpin = true;

const levelInput = document.getElementById('level');
const levelValue = document.getElementById('levelValue');
const stats = document.getElementById('stats');
const rebuildBtn = document.getElementById('rebuildBtn');
const spinBtn = document.getElementById('spinBtn');

function add2(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}

function sub2(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}

function mul2(v, s) {
    return { x: v.x * s, y: v.y * s };
}

function rotate90CCW(v) {
    return { x: -v.y, y: v.x };
}

// Thay 1 đoạn AB bằng mẫu 8 đoạn con kiểu biên Minkowski phổ biến.
function minkowskiReplace(a, b) {
    const v = sub2(b, a);
    const q = mul2(v, 0.25);
    const n = rotate90CCW(q);

    const p1 = add2(a, q);
    const p2 = add2(p1, n);
    const p3 = add2(p2, q);
    const p4 = add2(p3, { x: -n.x, y: -n.y });
    const p5 = add2(p4, { x: -n.x, y: -n.y });
    const p6 = add2(p5, q);
    const p7 = add2(p6, n);

    return [a, p1, p2, p3, p4, p5, p6, p7, b];
}

function iterateClosedPolyline(points) {
    const result = [];
    for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const replaced = minkowskiReplace(a, b);
    if (i === 0) {
        result.push(...replaced.slice(0, -1));
    } else {
        result.push(...replaced.slice(1, -1));
    }
    }
    return result;
}

function buildMinkowskiIsland(level) {
    let points = [
    { x: -24, y: -24 },
    { x:  24, y: -24 },
    { x:  24, y:  24 },
    { x: -24, y:  24 }
    ];

    for (let i = 0; i < level; i++) {
    points = iterateClosedPolyline(points);
    }
    return points;
}

function pointsToVectors(points, z = 0) {
    return points.map(p => new THREE.Vector3(p.x, p.y, z));
}

function disposeGroup(group) {
    if (!group) return;
    group.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
    }
    });
    scene.remove(group);
}

function rebuildIsland() {
    const level = parseInt(levelInput.value, 10);
    levelValue.textContent = level;

    const pts = buildMinkowskiIsland(level);
    const vectors = pointsToVectors(pts, 0);
    const closedVectors = [...vectors, vectors[0].clone()];

    disposeGroup(islandGroup);
    islandGroup = new THREE.Group();

    // Tạo mặt đảo.
    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x, pts[i].y);
    }
    shape.closePath();

    const fillGeometry = new THREE.ShapeGeometry(shape);
    const fillMaterial = new THREE.MeshPhongMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
    });
    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    fillMesh.position.z = -0.2;
    islandGroup.add(fillMesh);

    // Viền fractal.
    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(closedVectors);
    const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x1d4ed8 });
    const outline = new THREE.Line(outlineGeometry, outlineMaterial);
    outline.position.z = 0.6;
    islandGroup.add(outline);

    // Các đỉnh nổi bật để dễ quan sát.
    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(vectors);
    const pointsMaterial = new THREE.PointsMaterial({
    color: 0x0f172a,
    size: level <= 1 ? 1.8 : (level === 2 ? 1.2 : 0.85),
    sizeAttenuation: false
    });
    const pointCloud = new THREE.Points(pointsGeometry, pointsMaterial);
    pointCloud.position.z = 1.0;
    islandGroup.add(pointCloud);

    // Khung đáy nhẹ để tăng cảm giác 3D.
    const baseGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: 2.2,
    bevelEnabled: false
    });
    const baseMaterial = new THREE.MeshPhongMaterial({
    color: 0xbfdbfe,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide
    });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.z = -1.4;
    islandGroup.add(baseMesh);

    scene.add(islandGroup);

    const edges = 4 * Math.pow(8, level);
    stats.innerHTML = `
    <strong>Thông tin:</strong><br>
    - Số mức lặp: ${level}<br>
    - Số cạnh biên sau lặp: ${edges}<br>
    - Số đỉnh hiển thị: ${pts.length}<br>
    - Công thức chiều fractal biên: D = log(8) / log(4) = 1.5
    `;
}

rebuildBtn.addEventListener('click', rebuildIsland);
levelInput.addEventListener('input', () => {
    levelValue.textContent = levelInput.value;
    rebuildIsland();
});
spinBtn.addEventListener('click', () => {
    autoSpin = !autoSpin;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

rebuildIsland();

function animate() {
    requestAnimationFrame(animate);
    if (islandGroup && autoSpin) {
    islandGroup.rotation.z += 0.0035;
    }
    controls.update();
    renderer.render(scene, camera);
}
animate();