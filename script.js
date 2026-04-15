const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const levelInput = document.getElementById('level');
const levelValue = document.getElementById('levelValue');
const stats = document.getElementById('stats');
const redrawBtn = document.getElementById('redrawBtn');

function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}

function mul(v, s) {
    return { x: v.x * s, y: v.y * s };
}

function len(v) {
    return Math.hypot(v.x, v.y);
}

function normalize(v) {
    const l = len(v);
    return { x: v.x / l, y: v.y / l };
}

function leftNormal(v) {
    return { x: -v.y, y: v.x };
}

// Sinh mẫu Minkowski type 2 cho một cạnh A -> B
function generateSegment(A, B) {
    const d = sub(B, A);
    const L = len(d);
    const u = normalize(d);
    const v = leftNormal(u);
    const step = L / 4;

    const p0 = A;
    const p1 = add(p0, mul(u, step));
    const p2 = add(p1, mul(v, step));
    const p3 = add(p2, mul(u, step));
    const p4 = sub(p3, mul(v, step));
    const p5 = sub(p4, mul(v, step));
    const p6 = add(p5, mul(u, step));
    const p7 = add(p6, mul(v, step));
    const p8 = add(p7, mul(u, step));

    return [p0, p1, p2, p3, p4, p5, p6, p7, p8];
}

function iteratePolygon(points) {
    const result = [];
    for (let i = 0; i < points.length; i++) {
    const A = points[i];
    const B = points[(i + 1) % points.length];
    const generated = generateSegment(A, B);
    if (i === 0) {
        result.push(...generated.slice(0, -1));
    } else {
        result.push(...generated.slice(1, -1));
    }
    }
    return result;
}

function createSquare(size) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const h = size / 2;
    return [
    { x: cx - h, y: cy - h },
    { x: cx + h, y: cy - h },
    { x: cx + h, y: cy + h },
    { x: cx - h, y: cy + h }
    ];
}

function buildMinkowskiIsland(level) {
    let poly = createSquare(220);
    for (let i = 0; i < level; i++) {
    poly = iteratePolygon(poly);
    }
    return poly;
}

function bounds(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function fitPoints(points, padding = 40) {
    const b = bounds(points);
    const scale = Math.min(
    (canvas.width - padding * 2) / b.width,
    (canvas.height - padding * 2) / b.height
    );
    return points.map(p => ({
    x: (p.x - b.minX) * scale + padding,
    y: (p.y - b.minY) * scale + padding
    }));
}

function polygonPerimeter(points) {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
    sum += len(sub(points[(i + 1) % points.length], points[i]));
    }
    return sum;
}

function draw(level) {
    let pts = buildMinkowskiIsland(level);
    pts = fitPoints(pts, 45);
    const perimeter = polygonPerimeter(pts);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#eef4ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = '#dbeafe';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    stats.textContent = `Số điểm biên: ${pts.length} | Chu vi tương đối: ${perimeter.toFixed(2)} | Số lần lặp: ${level}`;
}

function update() {
    const level = Number(levelInput.value);
    levelValue.textContent = level;
    draw(level);
}

levelInput.addEventListener('input', update);
redrawBtn.addEventListener('click', update);

update();