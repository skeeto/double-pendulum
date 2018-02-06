"use strict";
const G = 2.0; // gravitational constant
const M = 1.0; // mass
const L = 1.0; // length
const dtMax = 30.0; // ms
const tailMax = 400; // tail length

function deriviative(a1, a2, p1, p2) {
    let ml2 = M * L * L;
    let cos12 = Math.cos(a1 - a2);
    let sin12 = Math.sin(a1 - a2);
    let da1 = 6 / ml2 * (2 * p1 - 3 * cos12 * p2) / (16 - 9 * cos12 * cos12);
    let da2 = 6 / ml2 * (8 * p2 - 3 * cos12 * p1) / (16 - 9 * cos12 * cos12);
    let dp1 = ml2 / -2 * (+da1 * da2 * sin12 + 3 * G / L * Math.sin(a1));
    let dp2 = ml2 / -2 * (-da1 * da2 * sin12 + 3 * G / L * Math.sin(a2));
    return [da1, da2, dp1, dp2];
}

// Update pendulum by timestep
function rk4(k1a1, k1a2, k1p1, k1p2, dt) {
    let [k1da1, k1da2, k1dp1, k1dp2] = deriviative(k1a1, k1a2, k1p1, k1p2);

    let k2a1 = k1a1 + k1da1 * dt / 2;
    let k2a2 = k1a2 + k1da2 * dt / 2;
    let k2p1 = k1p1 + k1dp1 * dt / 2;
    let k2p2 = k1p2 + k1dp2 * dt / 2;

    let [k2da1, k2da2, k2dp1, k2dp2] = deriviative(k2a1, k2a2, k2p1, k2p2);

    let k3a1 = k1a1 + k2da1 * dt / 2;
    let k3a2 = k1a2 + k2da2 * dt / 2;
    let k3p1 = k1p1 + k2dp1 * dt / 2;
    let k3p2 = k1p2 + k2dp2 * dt / 2;

    let [k3da1, k3da2, k3dp1, k3dp2] = deriviative(k3a1, k3a2, k3p1, k3p2);

    let k4a1 = k1a1 + k3da1 * dt;
    let k4a2 = k1a2 + k3da2 * dt;
    let k4p1 = k1p1 + k3dp1 * dt;
    let k4p2 = k1p2 + k3dp2 * dt;

    let [k4da1, k4da2, k4dp1, k4dp2] = deriviative(k4a1, k4a2, k4p1, k4p2);

    return [
        k1a1 + (k1da1 + 2*k2da1 + 2*k3da1 + k4da1) * dt / 6,
        k1a2 + (k1da2 + 2*k2da2 + 2*k3da2 + k4da2) * dt / 6,
        k1p1 + (k1dp1 + 2*k2dp1 + 2*k3dp1 + k4dp1) * dt / 6,
        k1p2 + (k1dp2 + 2*k2dp2 + 2*k3dp2 + k4dp2) * dt / 6
    ];
}

function history(n) {
    let h = {
        i: 0,
        length: 0,
        x: new Float32Array(n),
        y: new Float32Array(n),
        push: function(x, y) {
            h.x[h.i] = x;
            h.y[h.i] = y;
            h.i = (h.i + 1) % n;
            if (h.length < n)
                h.length++;
        },
        visit: function(f) {
            for (let j = h.i + n - 2; j > h.i + n - h.length - 1; j--) {
                let a = (j + 1) % n;
                let b = (j + 0) % n;
                f(h.x[a], h.y[a], h.x[b], h.y[b]);
            }
        }
    };
    return h;
}

function draw(ctx, tail, a1, a2, p1, p2) {
    let w = ctx.canvas.width;
    let h = ctx.canvas.height;
    let cx = w / 2;
    let cy = h / 2;
    let d = Math.min(w, h) / 4.2;
    let x0 = Math.sin(a1) * d + cx;
    let y0 = Math.cos(a1) * d + cy;
    let x1 = Math.sin(a2) * d + x0;
    let y1 = Math.cos(a2) * d + y0;

    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'butt';
    ctx.lineWidth = d / 60;
    tail.push(x1, y1);
    let n = tail.length;
    tail.visit(function(x0, y0, x1, y1) {
        let g = n-- / tail.length;
        ctx.strokeStyle = 'rgba(0, 0, 256, ' + Math.sqrt(g) + ')';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    });

    ctx.lineWidth = d / 30;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x0, y0);
    ctx.stroke();
    ctx.beginPath(); // draw separately to avoid common canvas bug
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x0, y0, d / 15, 0, 2 * Math.PI);
    ctx.arc(x1, y1, d / 15, 0, 2 * Math.PI);
    ctx.fill();
}

// Create a new, random double pendulum
function pendulum() {
    return [
        Math.random() * Math.PI + Math.PI / 2,
        Math.random() * Math.PI + Math.PI / 2,
        0,
        0
    ];
}

(function() {
    let ctx = document.getElementById('pendulum').getContext('2d');
    let [a1, a2, p1, p2] = new pendulum();
    let tail = new history(tailMax);

    let last = 0.0;
    function cb(t) {
        let dt = Math.min(t - last, dtMax)
        ctx.canvas.width  = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        if (t > 0.0) {
            [a1, a2, p1, p2] = rk4(a1, a2, p1, p2, dt / 1000.0);
            draw(ctx, tail, a1, a2, p1, p2);
        }
        last = t;
        window.requestAnimationFrame(cb);
    }

    window.requestAnimationFrame(cb);
}());
