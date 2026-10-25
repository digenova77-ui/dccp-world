/**
 * DCCP world renderer.
 * Mobile budget: DPR capped at 2, no antialias on dense screens,
 * preserveDrawingBuffer false, no blur pass.
 */
import { TOKENS } from "./tokens.js";

export function gpuBudget(width, height, dpr) {
  const pixelRatio = Math.min(dpr || 1, 2);
  const pixels = width * height * pixelRatio * pixelRatio;
  const dense = pixelRatio >= 2 || width < 900 || pixels > 2_000_000;
  return {
    pixelRatio,
    antialias: !dense,
    preserveDrawingBuffer: false,
    pixels
  };
}

function hex(color) {
  const n = parseInt(color.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const VERT = `
attribute vec3 aPos;
uniform mat4 uMvp;
void main(){ gl_Position = uMvp * vec4(aPos, 1.0); }
`;
const FRAG = `
precision mediump float;
uniform vec3 uColor;
void main(){ gl_FragColor = vec4(uColor, 1.0); }
`;

function sphere(lat, lon) {
  const pos = [];
  for (let y = 0; y <= lat; y++) {
    const v = y / lat;
    const phi = v * Math.PI;
    for (let x = 0; x <= lon; x++) {
      const u = x / lon;
      const theta = u * Math.PI * 2;
      pos.push(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    }
  }
  const idx = [];
  for (let y = 0; y < lat; y++) {
    for (let x = 0; x < lon; x++) {
      const a = y * (lon + 1) + x;
      idx.push(a, a + lon + 1, a + 1, a + 1, a + lon + 1, a + lon + 2);
    }
  }
  return { pos: new Float32Array(pos), idx: new Uint16Array(idx) };
}

function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function translate(x, y, z) {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}
function scale(s) {
  return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]);
}

export function mountWorld(canvas) {
  const budget = gpuBudget(canvas.clientWidth || 1, canvas.clientHeight || 1, window.devicePixelRatio || 1);
  const gl = canvas.getContext("webgl", {
    antialias: budget.antialias,
    preserveDrawingBuffer: false,
    alpha: false
  });
  if (!gl) return { ok: false, reason: "webgl-unavailable", budget };
  const dpr = budget.pixelRatio;
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VERT);
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, FRAG);
  gl.compileShader(fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const mesh = sphere(12, 16);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.pos, gl.STATIC_DRAW);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
  const uMvp = gl.getUniformLocation(prog, "uMvp");
  const uColor = gl.getUniformLocation(prog, "uColor");
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(...hex(TOKENS.background), 1);
  const bodies = [
    { key: "residual", color: TOKENS.orbs.residual.color, r: 0.42, orbit: 2.4, phase: 0 },
    { key: "edge", color: TOKENS.orbs.edge.color, r: 0.38, orbit: 2.4, phase: 1 },
    { key: "research", color: TOKENS.orbs.research.color, r: 0.38, orbit: 2.4, phase: 2 },
    { key: "dclm", color: TOKENS.orbs.dclm.color, r: 0.4, orbit: 2.4, phase: 3 },
    { key: "unity", color: TOKENS.orbs.unity.color, r: 0.4, orbit: 2.4, phase: 4 },
    { key: "efuse", color: TOKENS.orbs.efuse.color, r: 0.38, orbit: 2.4, phase: 5 },
    { key: "iris-shell", color: TOKENS.iris.shell, r: 0.55, orbit: 0, phase: 0 },
    { key: "iris-a", color: TOKENS.iris.cores[0], r: 0.16, orbit: 0.28, phase: 0.4 },
    { key: "iris-b", color: TOKENS.iris.cores[1], r: 0.16, orbit: 0.28, phase: 3.6 }
  ];
  let draws = 0;
  let running = true;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function frame(t) {
    if (!running) return;
    const time = reduce ? 0 : t * 0.001;
    const aspect = canvas.width / Math.max(1, canvas.height);
    const proj = perspective(0.9, aspect, 0.1, 40);
    const view = translate(0, 0, -7);
    const vp = mul(proj, view);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    draws = 0;
    for (const body of bodies) {
      const ang = time * 0.35 + body.phase;
      const x = Math.cos(ang) * body.orbit;
      const z = Math.sin(ang) * body.orbit * 0.35;
      const y = Math.sin(time * 0.6 + body.phase) * 0.12;
      const model = mul(translate(x, y, z), scale(body.r));
      gl.uniformMatrix4fv(uMvp, false, mul(vp, model));
      gl.uniform3fv(uColor, hex(body.color));
      gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);
      draws += 1;
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
  return {
    ok: true,
    budget,
    textureBytes: 0,
    stop() { running = false; },
    get draws() { return draws; },
    bodies: bodies.map((b) => b.key)
  };
}
