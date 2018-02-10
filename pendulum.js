"use strict";
const G = 1.2; // gravitational acceleration
const M = 1.0; // mass
const L = 1.0; // length
const dtMax = 30.0; // ms
const tailMax = 400; // tail length

const barWidth = 0.04;
const barLength = 0.23;
const massRadius = 0.035;

// WebGL stuff
const quad = new Float32Array([-1, -1, +1, -1, -1, +1, +1, +1]);

const massShader = {
    vert: `
precision mediump float;
attribute vec2 point;
uniform vec2 center;
uniform vec2 aspect;
varying vec2 vpoint;
void main() {
    vpoint = point;
    gl_Position = vec4(point * ${massRadius} / aspect + center, 0, 1);
}`,
    frag: `
precision mediump float;
uniform vec2 aspect;
uniform vec3 color;
varying vec2 vpoint;
void main() {
    float dist = distance(vec2(0, 0), vpoint);
    float v = smoothstep(1.0, 0.9, dist);
    gl_FragColor = vec4(color, v);
}`,
};

const barShader = {
    vert: `
precision mediump float;
attribute vec2 point;
uniform float angle;
uniform vec2 attach;
uniform vec2 aspect;
void main() {
    mat2 rotate = mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
    vec2 pos = rotate * (point * vec2(1, ${barWidth}) + vec2(1, 0));
    gl_Position = vec4((pos * ${barLength} / aspect + attach), 0, 1);
}`,
    frag: `
precision mediump float;
uniform vec3 color;
void main() {
    gl_FragColor = vec4(color, 1);
}`,
};

const tailShader = {
    vert: `
precision mediump float;
attribute vec2 point;
attribute float alpha;
uniform vec2 aspect;
uniform float length;
varying float dist;
void main() {
    dist = alpha;
    gl_Position = vec4(point * vec2(1, -1) / aspect, 0, 1);
}`,
    frag: `
precision mediump float;
uniform vec3 color;
varying float dist;
void main() {
    gl_FragColor = vec4(color, dist);
}`,
};

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
        v: new Float32Array(n * 2),
        push: function(a1, a2) {
            h.v[h.i * 2 + 0] = Math.sin(a1) + Math.sin(a2);
            h.v[h.i * 2 + 1] = Math.cos(a1) + Math.cos(a2);
            h.i = (h.i + 1) % n;
            if (h.length < n)
                h.length++;
        },
        visit: function(f) {
            for (let j = h.i + n - 2; j > h.i + n - h.length - 1; j--) {
                let a = (j + 1) % n;
                let b = (j + 0) % n;
                f(h.v[a * 2], h.v[a * 2 + 1], h.v[b * 2], h.v[b * 2 + 1]);
            }
        }
    };
    return h;
}

function compile(gl, vert, frag) {
    let v = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(v, vert);
    let f = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(f, frag);
    gl.compileShader(v);
    if (!gl.getShaderParameter(v, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(v));
    gl.compileShader(f);
    if (!gl.getShaderParameter(f, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(f));
    let p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(p));
    gl.deleteShader(v);
    gl.deleteShader(f);
    var result = {
        p: p,
        a: {},
        u: {}
    };
    let nattrib = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (let a = 0; a < nattrib; a++) {
        let name = gl.getActiveAttrib(p, a).name;
        result.a[name] = gl.getAttribLocation(p, name);
    }
    let nuniform = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let u = 0; u < nuniform; u++) {
        let name = gl.getActiveUniform(p, u).name;
        result.u[name] = gl.getUniformLocation(p, name);
    }
    return result;
};

// Create a new, random double pendulum
function pendulum({tailColor = 'blue', massColor = 'black'} = {}) {
    let tail = new history(tailMax);
    let a1 = Math.random() * Math.PI / 2 + Math.PI * 3 / 4;
    let a2 = Math.random() * Math.PI / 2 + Math.PI * 3 / 4;
    let p1 = 0.0;
    let p2 = 0.0;
    let webgl = null;

    return {
        step: function(dt) {
            [a1, a2, p1, p2] = rk4(a1, a2, p1, p2, dt);
            tail.push(a1, a2);
        },
        draw2d: function(ctx) {
            draw2d(ctx, tail, a1, a2, massColor, tailColor);
        },
        draw3d: function(gl) {
            if (!webgl)
                webgl = draw3dInit(gl, tail);
            draw3d(gl, webgl, tail, a1, a2);
        },
    };
}

function draw3dInit(gl, tail) {
    let webgl = {};
    gl.clearColor(1, 1, 1, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    webgl.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, webgl.quad);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    webgl.tailb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, webgl.tailb);
    gl.bufferData(gl.ARRAY_BUFFER, tail.v, gl.STREAM_DRAW);

    webgl.taile = gl.createBuffer();
    webgl.taila = gl.createBuffer();
    let n = tail.v.length / 2;
    let index = new Uint16Array(n * 2);
    let alpha = new Float32Array(n * 2);
    for (let i = 0; i < n * 2; i++) {
        let fade = (i % n) / (n - 1);
        index[i] = n - 1 - (i % n);
        alpha[i] = Math.sqrt(fade);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, webgl.taile);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, webgl.taila);
    gl.bufferData(gl.ARRAY_BUFFER, alpha, gl.STATIC_DRAW);

    webgl.mass = compile(gl, massShader.vert, massShader.frag);
    webgl.bar  = compile(gl, barShader.vert, barShader.frag);
    webgl.tail = compile(gl, tailShader.vert, tailShader.frag);

    return webgl;
}

function draw3d(gl, webgl, hist, a1, a2) {
    let w = gl.canvas.width;
    let h = gl.canvas.height;
    let z = Math.min(w, h);
    let ax = w / z;
    let ay = h / z;
    let d = barLength * 2;
    let x0 = +Math.sin(a1) * d / ax;
    let y0 = -Math.cos(a1) * d / ay;
    let x1 = +Math.sin(a2) * d / ax + x0;
    let y1 = -Math.cos(a2) * d / ay + y0;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let tail = webgl.tail;
    gl.useProgram(tail.p);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, webgl.taile);
    gl.bindBuffer(gl.ARRAY_BUFFER, webgl.tailb);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, hist.v);
    gl.vertexAttribPointer(tail.a.point, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(tail.a.point);
    gl.bindBuffer(gl.ARRAY_BUFFER, webgl.taila);
    gl.vertexAttribPointer(tail.a.alpha, 1, gl.FLOAT, false, 0,
        (hist.v.length / 2 - hist.i) * 4);
    gl.enableVertexAttribArray(tail.a.alpha);
    gl.uniform3f(tail.u.color, 0, 0, 1);
    gl.uniform2f(tail.u.aspect, ax / d, ay / d);
    gl.uniform1f(tail.u.length, hist.length);
    gl.drawElements(gl.LINE_STRIP, hist.length, gl.UNSIGNED_SHORT,
        hist.v.length - hist.i * 2);

    let mass = webgl.mass;
    gl.useProgram(mass.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, webgl.quad);
    gl.vertexAttribPointer(mass.a.point, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(mass.a.point);
    gl.uniform3f(mass.u.color, 0, 0, 0);
    gl.uniform2f(mass.u.aspect, ax, ay);
    gl.uniform2f(mass.u.center, x0, y0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform2f(mass.u.center, x1, y1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    let bar = webgl.bar;
    gl.useProgram(bar.p);
    gl.vertexAttribPointer(bar.a.point, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(bar.a.point);
    gl.uniform3f(bar.u.color, 0, 0, 0);
    gl.uniform2f(bar.u.aspect, ax, ay);
    gl.uniform2f(bar.u.attach, 0, 0);
    gl.uniform1f(bar.u.angle, a1 - Math.PI / 2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform2f(bar.u.attach, x0, y0);
    gl.uniform1f(bar.u.angle, a2 - Math.PI / 2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

function draw2d(ctx, tail, a1, a2, massColor, tailColor) {
    let w = ctx.canvas.width;
    let h = ctx.canvas.height;
    let cx = w / 2;
    let cy = h / 2;
    let z = Math.min(w, h);
    let d = z * barLength;
    let x0 = Math.sin(a1) * d + cx;
    let y0 = Math.cos(a1) * d + cy;
    let x1 = Math.sin(a2) * d + x0;
    let y1 = Math.cos(a2) * d + y0;

    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'butt';
    ctx.lineWidth = d / 60;
    let n = tail.length;
    tail.visit(function(x0, y0, x1, y1) {
        ctx.globalAlpha = n-- / tail.length;
        ctx.strokeStyle = tailColor;
        ctx.beginPath();
        ctx.moveTo(x0 * d + cx, y0 * d + cy);
        ctx.lineTo(x1 * d + cx, y1 * d + cy);
        ctx.stroke();
    });

    ctx.lineWidth = z * barWidth / 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = massColor;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x0, y0);
    ctx.stroke();
    ctx.beginPath(); // draw separately to avoid common canvas bug
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x0, y0, z * massRadius / 2, 0, 2 * Math.PI);
    ctx.arc(x1, y1, z * massRadius / 2, 0, 2 * Math.PI);
    ctx.fill();
}

(function() {
    let state = new pendulum();
    let c2d = document.getElementById('c2d');
    let c3d = document.getElementById('c3d');
    let canvas;
    let mode;
    let running = true;
    let gl = c3d.getContext('webgl');
    let ctx = c2d.getContext('2d');
    if (!gl) {
        mode = '2d-only';
        canvas = c2d;
        c3d.style.display = 'none';
    } else {
        mode = '3d';
        canvas = c3d;
        c2d.style.display = 'none';
    }

    function toggleMode() {
        switch (mode) {
            case '2d':
                mode = '3d';
                canvas = c3d;
                c3d.style.display = 'block';
                c2d.style.display = 'none';
                break;
            case '3d':
                mode = '2d';
                canvas = c2d;
                c2d.style.display = 'block';
                c3d.style.display = 'none';
                break;
        }
    }

    window.addEventListener('keypress', function(e) {
        switch (e.charCode) {
            case 32:
                running = !running;
                break;
            case 109:
                toggleMode();
                break;
        }
    });

    let last = 0.0;
    function cb(t) {
        let dt = Math.min(t - last, dtMax)
        let ww = window.innerWidth;
        let wh = window.innerHeight;
        if (canvas.width != ww || canvas.height != wh) {
            /* Only resize when necessary */
            canvas.width = ww;
            canvas.height = wh;
        }
        if (running)
            state.step(dt / 1000.0);
        if (mode === '3d')
            state.draw3d(gl);
        else
            state.draw2d(ctx);
        last = t;
        window.requestAnimationFrame(cb);
    }

    window.requestAnimationFrame(cb);
}());
