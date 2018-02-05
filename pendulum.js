const G = 3.0; // gravitational constant
const M = 2.0; // mass
const L = 1.0; // length
const dtMax = 30.0; // ms
const historyLength = 256; // tail length

// Update pendulum by timestep
function update(s, dt) {
    const ml2 = M * L * L;
    function fda0(a0, a1, p0, p1) {
        const cos01 = Math.cos(a0 - a1);
        return 6 / ml2 * (2 * p0 - 3 * cos01 * p1) / (16 - 9 * cos01 * cos01);
    }
    function fda1(a0, a1, p0, p1) {
        const cos01 = Math.cos(a0 - a1);
        return 6 / ml2 * (8 * p1 - 3 * cos01 * p0) / (16 - 9 * cos01 * cos01);
    }
    function fdp0(a0, a1, da0, da1, p0, p1) {
        const sin01 = Math.sin(a0 - a1);
        return ml2 / -2 * (+da0 * da1 * sin01 + 3 * G / L * Math.sin(a0));
    }
    function fdp1(a0, a1, da0, da1, p0, p1) {
        const sin01 = Math.sin(a0 - a1);
        return ml2 / -2 * (-da0 * da1 * sin01 + 3 * G / L * Math.sin(a1));
    }

    // Classical Runge–Kutta (RK4)
    const k1a0 = s.a0;
    const k1a1 = s.a1;
    const k1p0 = s.p0;
    const k1p1 = s.p1;

    const k1da0 = fda0(k1a0, k1a1, k1p0, k1p1);
    const k1da1 = fda1(k1a0, k1a1, k1p0, k1p1);
    const k1dp0 = fdp0(k1a0, k1a1, k1da0, k1da1, k1p0, k1p1);
    const k1dp1 = fdp1(k1a0, k1a1, k1da0, k1da1, k1p0, k1p1);

    const k2a0 = k1a0 + k1da0 * dt / 2;
    const k2a1 = k1a1 + k1da1 * dt / 2;
    const k2p0 = k1p0 + k1dp0 * dt / 2;
    const k2p1 = k1p1 + k1dp1 * dt / 2;

    const k2da0 = fda0(k2a0, k2a1, k2p0, k2p1);
    const k2da1 = fda1(k2a0, k2a1, k2p0, k2p1);
    const k2dp0 = fdp0(k2a0, k2a1, k2da0, k2da1, k2p0, k2p1);
    const k2dp1 = fdp1(k2a0, k2a1, k2da0, k2da1, k2p0, k2p1);

    const k3a0 = k1a0 + k2da0 * dt / 2;
    const k3a1 = k1a1 + k2da1 * dt / 2;
    const k3p0 = k1p0 + k2dp0 * dt / 2;
    const k3p1 = k1p1 + k2dp1 * dt / 2;

    const k3da0 = fda0(k3a0, k3a1, k3p0, k3p1);
    const k3da1 = fda1(k3a0, k3a1, k3p0, k3p1);
    const k3dp0 = fdp0(k3a0, k3a1, k3da0, k3da1, k3p0, k3p1);
    const k3dp1 = fdp1(k3a0, k3a1, k3da0, k3da1, k3p0, k3p1);

    const k4a0 = k1a0 + k3da0 * dt;
    const k4a1 = k1a1 + k3da1 * dt;
    const k4p0 = k1p0 + k3dp0 * dt;
    const k4p1 = k1p1 + k3dp1 * dt;

    const k4da0 = fda0(k4a0, k4a1, k4p0, k4p1);
    const k4da1 = fda1(k4a0, k4a1, k4p0, k4p1);
    const k4dp0 = fdp0(k4a0, k4a1, k4da0, k4da1, k4p0, k4p1);
    const k4dp1 = fdp1(k4a0, k4a1, k4da0, k4da1, k4p0, k4p1);

    s.a0 = k1a0 + (k1da0 + 2*k2da0 + 2*k3da0 + k4da0) * dt / 6;
    s.a1 = k1a1 + (k1da1 + 2*k2da1 + 2*k3da1 + k4da1) * dt / 6;
    s.p0 = k1p0 + (k1dp0 + 2*k2dp0 + 2*k3dp0 + k4dp0) * dt / 6;
    s.p1 = k1p1 + (k1dp1 + 2*k2dp1 + 2*k3dp1 + k4dp1) * dt / 6;
}

// Render a given double pendulum to a context
function draw(ctx, s, history, histi) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const d = w / 5;
    const offset = Math.PI / 2;
    const x0 = Math.cos(s.a0 + offset) * d + cx;
    const y0 = Math.sin(s.a0 + offset) * d + cy;
    const x1 = Math.cos(s.a1 + offset) * d + x0;
    const y1 = Math.sin(s.a1 + offset) * d + y0;

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1.5;
    const len = history.length;
    history[histi].x = x1;
    history[histi].y = y1;
    history[histi].valid = true;
    let px = x1;
    let py = y1;
    for (let i = histi + len - 1; i > histi; i--) {
        if (history[i % len].valid) {
            let x = history[i % len].x;
            let y = history[i % len].y;
            let g = (i - histi) / len;
            ctx.strokeStyle = 'rgba(0, 0, 256, ' + Math.sqrt(g) + ')';
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(x, y);
            ctx.stroke();
            px = x;
            py = y;
        }
    }

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x0, y0, d / 20, 0, 2 * Math.PI);
    ctx.arc(x1, y1, d / 20, 0, 2 * Math.PI);
    ctx.fill();
}

// Create a random double pendulum
function generate() {
    return {
        a0: Math.random() * Math.PI + Math.PI / 2,
        a1: Math.random() * Math.PI + Math.PI / 2,
        p0: 0,
        p1: 0
    };
}

(function() {
    let ctx = document.getElementById('pendulum').getContext('2d');
    let s = generate();

    let history = [];
    let histi = 0;
    for (let i = 0; i < historyLength; i++) {
        history.push({
            x: 0.0,
            y: 0.0,
            valid: false
        });
    }

    let last = 0.0;
    function cb(t) {
        const dt = Math.min(t - last, dtMax)
        if (t > 0.0) {
            update(s, dt / 1000.0);
            draw(ctx, s, history, histi++ % historyLength);
        }
        last = t;
        window.requestAnimationFrame(cb);
    }
    window.requestAnimationFrame(cb);
}());
