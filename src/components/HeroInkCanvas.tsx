"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/* ─────────────────────────────────────────────────────────────
   Hero 墨流し背景 — WebGL Stable Fluids（velocity/dye field、
   advection、vorticity、pressure solve、ping-pong FBO）。
   墨色以吸收向量儲存，顯示時 paper * exp(-absorption) 做減法混色，
   讓墨像沉進和紙纖維裡。canvas 本身 pointer-events: none，
   互動事件綁在 window 上換算座標。
   ───────────────────────────────────────────────────────────── */

// 和紙底色 #efeae0
const PAPER: [number, number, number] = [0.937, 0.918, 0.878];

// 墨色（吸收向量 = -ln(目標色 / 紙色)）
const INKS: { name: string; absorb: [number, number, number] }[] = [
  { name: "sumi", absorb: [2.22, 2.2, 1.97] }, // 墨黑 #1a1a1f
  { name: "ai", absorb: [2.39, 1.3, 0.61] }, // 深藍 #16407a
  { name: "shu", absorb: [0.27, 1.19, 1.5] }, // 暖銅紅 #b74732
  { name: "matsu", absorb: [1.65, 0.75, 1.0] }, // 松葉綠 #2e6e52
];
// 淡金棕 #b99a63 — 只在自動演出偶爾出現
const GOLD: [number, number, number] = [0.26, 0.42, 0.82];

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  attach(id: number): number;
}
interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

const BASE_VERTEX = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform vec2 texelSize;
  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const SHADERS = {
  clear: `
    precision mediump float; precision mediump sampler2D;
    varying vec2 vUv; uniform sampler2D uTexture; uniform float value;
    void main () { gl_FragColor = value * texture2D(uTexture, vUv); }
  `,
  // 墨滴：吸收量加法疊加（減法混色），上限避免死黑
  splatDye: `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv; uniform sampler2D uTarget;
    uniform float aspectRatio; uniform vec3 color; uniform vec2 point;
    uniform float radius; uniform float strength;
    void main () {
      vec2 p = vUv - point; p.x *= aspectRatio;
      float a = exp(-dot(p, p) / radius) * strength;
      vec3 base = texture2D(uTarget, vUv).rgb;
      gl_FragColor = vec4(min(base + color * a, vec3(1.35)), 1.0);
    }
  `,
  splatVel: `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv; uniform sampler2D uTarget;
    uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
    void main () {
      vec2 p = vUv - point; p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
    }
  `,
  advection: `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource;
    uniform vec2 texelSize; uniform float dt; uniform float dissipation;
    void main () {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      vec4 result = texture2D(uSource, coord);
      float decay = 1.0 + dissipation * dt;
      gl_FragColor = result / decay;
    }
  `,
  divergence: `
    precision mediump float; precision mediump sampler2D;
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; }
      if (vR.x > 1.0) { R = -C.x; }
      if (vT.y > 1.0) { T = -C.y; }
      if (vB.y < 0.0) { B = -C.y; }
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }
  `,
  curl: `
    precision mediump float; precision mediump sampler2D;
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }
  `,
  vorticity: `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
    uniform sampler2D uVelocity; uniform sampler2D uCurl;
    uniform float curl; uniform float dt;
    void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 vel = texture2D(uVelocity, vUv).xy;
      gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
    }
  `,
  pressure: `
    precision mediump float; precision mediump sampler2D;
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
    uniform sampler2D uPressure; uniform sampler2D uDivergence;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float divergence = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
    }
  `,
  gradientSubtract: `
    precision mediump float; precision mediump sampler2D;
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
    uniform sampler2D uPressure; uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `,
  // 顯示：和紙（低/中/高頻 noise + 纖維 + vignette）× exp(-吸收)
  display: `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv; uniform sampler2D uTexture;
    uniform vec2 uNoiseScale; uniform vec3 uPaper;
    float hash (vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise (vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    void main () {
      vec3 absorb = texture2D(uTexture, vUv).rgb;
      vec2 p = vUv * uNoiseScale;
      float nLow  = noise(p * 2.5);
      float nMid  = noise(p * 16.0 + 31.7);
      float nHigh = noise(p * 90.0 + 7.3);
      float fiber = noise(vec2(p.x * 130.0, p.y * 7.0) + 51.0);
      float tone = 0.982 + nLow * 0.016 + nMid * 0.011 + nHigh * 0.007 + fiber * 0.010;
      vec2 d = vUv - 0.5;
      float vignette = 1.0 - dot(d, d) * 0.16;
      vec3 paper = uPaper * tone * vignette;
      gl_FragColor = vec4(paper * exp(-absorb), 1.0);
    }
  `,
};

export default function HeroInkCanvas() {
  const t = useTranslations("hero");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const washRef = useRef<(() => void) | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* ── GL 初始化 ── */
    const params: WebGLContextAttributes = {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    };
    const gl2 = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
    const gl = (gl2 ??
      canvas.getContext("webgl", params) ??
      canvas.getContext("experimental-webgl", params)) as WebGLRenderingContext | null;
    if (!gl) {
      setSupported(false);
      return;
    }
    const isWebGL2 = !!gl2;

    let halfFloatType: number;
    let supportLinear: boolean;
    if (isWebGL2) {
      gl.getExtension("EXT_color_buffer_float");
      supportLinear = !!gl.getExtension("OES_texture_float_linear");
      halfFloatType = (gl as WebGL2RenderingContext).HALF_FLOAT;
    } else {
      const hf = gl.getExtension("OES_texture_half_float");
      supportLinear = !!gl.getExtension("OES_texture_half_float_linear");
      if (!hf) {
        setSupported(false);
        return;
      }
      halfFloatType = hf.HALF_FLOAT_OES;
    }

    const supportFormat = (internalFormat: number, format: number): boolean => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, halfFloatType, null);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.deleteFramebuffer(fb);
      gl.deleteTexture(tex);
      return ok;
    };

    type TexFormat = { internalFormat: number; format: number };
    let formatRGBA: TexFormat;
    let formatRG: TexFormat;
    let formatR: TexFormat;
    if (isWebGL2) {
      const g2 = gl as WebGL2RenderingContext;
      const pick = (internalFormat: number, format: number, fallback: () => TexFormat): TexFormat =>
        supportFormat(internalFormat, format) ? { internalFormat, format } : fallback();
      formatRGBA = pick(g2.RGBA16F, g2.RGBA, () => ({ internalFormat: g2.RGBA, format: g2.RGBA }));
      formatRG = pick(g2.RG16F, g2.RG, () => formatRGBA);
      formatR = pick(g2.R16F, g2.RED, () => formatRG);
    } else {
      if (!supportFormat(gl.RGBA, gl.RGBA)) {
        setSupported(false);
        return;
      }
      formatRGBA = { internalFormat: gl.RGBA, format: gl.RGBA };
      formatRG = formatRGBA;
      formatR = formatRGBA;
    }

    /* ── 參數（手機自動降規） ── */
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rm = reducedMotion ? 0.45 : 1;
    const config = {
      SIM_RES: 256,
      DYE_RES: 1024,
      PRESSURE_ITER: 26,
      VEL_DISSIPATION: 0.16,
      DYE_DISSIPATION: 0.07,
      CURL: 12,
      SPLAT_RADIUS: 0.0025,
      SPLAT_FORCE: 4600,
    };
    const applyDeviceTier = () => {
      const mobile = window.innerWidth < 640;
      config.SIM_RES = mobile ? 128 : 256;
      config.DYE_RES = mobile ? 512 : 1024;
      config.PRESSURE_ITER = mobile ? 16 : 26;
      return mobile;
    };
    let isMobile = applyDeviceTier();

    /* ── Shader / Program ── */
    const programs: WebGLProgram[] = [];
    const shaders: WebGLShader[] = [];
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      shaders.push(s);
      return s;
    };
    const vertexShader = compile(gl.VERTEX_SHADER, BASE_VERTEX);
    class Program {
      program: WebGLProgram;
      uniforms: Record<string, WebGLUniformLocation | null> = {};
      constructor(fragSrc: string) {
        const p = gl!.createProgram()!;
        gl!.attachShader(p, vertexShader);
        gl!.attachShader(p, compile(gl!.FRAGMENT_SHADER, fragSrc));
        gl!.linkProgram(p);
        programs.push(p);
        this.program = p;
        const n = gl!.getProgramParameter(p, gl!.ACTIVE_UNIFORMS) as number;
        for (let i = 0; i < n; i++) {
          const name = gl!.getActiveUniform(p, i)!.name;
          this.uniforms[name] = gl!.getUniformLocation(p, name);
        }
      }
      bind() {
        gl!.useProgram(this.program);
      }
    }

    const clearProg = new Program(SHADERS.clear);
    const splatDyeProg = new Program(SHADERS.splatDye);
    const splatVelProg = new Program(SHADERS.splatVel);
    const advectProg = new Program(SHADERS.advection);
    const divProg = new Program(SHADERS.divergence);
    const curlProg = new Program(SHADERS.curl);
    const vortProg = new Program(SHADERS.vorticity);
    const pressProg = new Program(SHADERS.pressure);
    const gradProg = new Program(SHADERS.gradientSubtract);
    const displayProg = new Program(SHADERS.display);

    /* ── 幾何 / blit ── */
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    const indexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    const blit = (target: FBO | null) => {
      if (target == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };

    /* ── FBO ── */
    const liveFBOs: FBO[] = [];
    const createFBO = (w: number, h: number, fmt: TexFormat, filter: number): FBO => {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internalFormat, w, h, 0, fmt.format, halfFloatType, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const obj: FBO = {
        texture,
        fbo,
        width: w,
        height: h,
        attach(id: number) {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return id;
        },
      };
      liveFBOs.push(obj);
      return obj;
    };
    const createDoubleFBO = (w: number, h: number, fmt: TexFormat, filter: number): DoubleFBO => {
      let fbo1 = createFBO(w, h, fmt, filter);
      let fbo2 = createFBO(w, h, fmt, filter);
      return {
        width: w,
        height: h,
        texelSizeX: 1 / w,
        texelSizeY: 1 / h,
        get read() {
          return fbo1;
        },
        get write() {
          return fbo2;
        },
        swap() {
          const tmp = fbo1;
          fbo1 = fbo2;
          fbo2 = tmp;
        },
      };
    };
    const releaseFBOs = () => {
      for (const f of liveFBOs) {
        gl.deleteTexture(f.texture);
        gl.deleteFramebuffer(f.fbo);
      }
      liveFBOs.length = 0;
    };

    const getResolution = (res: number) => {
      let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (aspect < 1) aspect = 1 / aspect;
      const min = Math.round(res);
      const max = Math.round(res * aspect);
      return gl.drawingBufferWidth > gl.drawingBufferHeight
        ? { width: max, height: min }
        : { width: min, height: max };
    };

    let dye!: DoubleFBO;
    let velocity!: DoubleFBO;
    let divergence!: FBO;
    let curlFBO!: FBO;
    let pressure!: DoubleFBO;
    const initFramebuffers = () => {
      releaseFBOs();
      const simRes = getResolution(config.SIM_RES);
      const dyeRes = getResolution(config.DYE_RES);
      const filtering = supportLinear ? gl.LINEAR : gl.NEAREST;
      gl.disable(gl.BLEND);
      dye = createDoubleFBO(dyeRes.width, dyeRes.height, formatRGBA, filtering);
      velocity = createDoubleFBO(simRes.width, simRes.height, formatRG, filtering);
      divergence = createFBO(simRes.width, simRes.height, formatR, gl.NEAREST);
      curlFBO = createFBO(simRes.width, simRes.height, formatR, gl.NEAREST);
      pressure = createDoubleFBO(simRes.width, simRes.height, formatR, gl.NEAREST);
    };

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        return true;
      }
      return false;
    };
    resizeCanvas();
    initFramebuffers();

    /* ── 模擬步驟 ── */
    let washing = false;
    let washUntil = 0;
    const step = (dt: number) => {
      gl.disable(gl.BLEND);
      const texelX = velocity.texelSizeX;
      const texelY = velocity.texelSizeY;

      curlProg.bind();
      gl.uniform2f(curlProg.uniforms.texelSize, texelX, texelY);
      gl.uniform1i(curlProg.uniforms.uVelocity, velocity.read.attach(0));
      blit(curlFBO);

      vortProg.bind();
      gl.uniform2f(vortProg.uniforms.texelSize, texelX, texelY);
      gl.uniform1i(vortProg.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(vortProg.uniforms.uCurl, curlFBO.attach(1));
      gl.uniform1f(vortProg.uniforms.curl, config.CURL);
      gl.uniform1f(vortProg.uniforms.dt, dt);
      blit(velocity.write);
      velocity.swap();

      divProg.bind();
      gl.uniform2f(divProg.uniforms.texelSize, texelX, texelY);
      gl.uniform1i(divProg.uniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);

      clearProg.bind();
      gl.uniform2f(clearProg.uniforms.texelSize, texelX, texelY);
      gl.uniform1i(clearProg.uniforms.uTexture, pressure.read.attach(0));
      gl.uniform1f(clearProg.uniforms.value, 0.8);
      blit(pressure.write);
      pressure.swap();

      pressProg.bind();
      gl.uniform2f(pressProg.uniforms.texelSize, texelX, texelY);
      gl.uniform1i(pressProg.uniforms.uDivergence, divergence.attach(0));
      for (let i = 0; i < config.PRESSURE_ITER; i++) {
        gl.uniform1i(pressProg.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
      }

      gradProg.bind();
      gl.uniform2f(gradProg.uniforms.texelSize, texelX, texelY);
      gl.uniform1i(gradProg.uniforms.uPressure, pressure.read.attach(0));
      gl.uniform1i(gradProg.uniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write);
      velocity.swap();

      advectProg.bind();
      gl.uniform2f(advectProg.uniforms.texelSize, texelX, texelY);
      gl.uniform1i(advectProg.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advectProg.uniforms.uSource, velocity.read.attach(0));
      gl.uniform1f(advectProg.uniforms.dt, dt);
      gl.uniform1f(advectProg.uniforms.dissipation, config.VEL_DISSIPATION);
      blit(velocity.write);
      velocity.swap();

      gl.uniform1i(advectProg.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advectProg.uniforms.uSource, dye.read.attach(1));
      gl.uniform1f(
        advectProg.uniforms.dissipation,
        washing ? 2.8 : config.DYE_DISSIPATION
      );
      blit(dye.write);
      dye.swap();
    };

    const render = () => {
      gl.disable(gl.BLEND);
      displayProg.bind();
      gl.uniform1i(displayProg.uniforms.uTexture, dye.read.attach(0));
      const aspect = canvas.width / Math.max(1, canvas.height);
      gl.uniform2f(displayProg.uniforms.uNoiseScale, aspect >= 1 ? aspect : 1, aspect >= 1 ? 1 : 1 / aspect);
      gl.uniform3f(displayProg.uniforms.uPaper, PAPER[0], PAPER[1], PAPER[2]);
      blit(null);
    };

    /* ── 墨滴 / 推力 ── */
    const splatVelocity = (x: number, y: number, dx: number, dy: number) => {
      splatVelProg.bind();
      gl.uniform1i(splatVelProg.uniforms.uTarget, velocity.read.attach(0));
      gl.uniform1f(splatVelProg.uniforms.aspectRatio, canvas.width / Math.max(1, canvas.height));
      gl.uniform2f(splatVelProg.uniforms.point, x, y);
      gl.uniform3f(splatVelProg.uniforms.color, dx, dy, 0);
      gl.uniform1f(splatVelProg.uniforms.radius, config.SPLAT_RADIUS * 3);
      blit(velocity.write);
      velocity.swap();
    };
    const splatDye = (
      x: number,
      y: number,
      absorb: [number, number, number],
      strength: number,
      radiusMul: number
    ) => {
      splatDyeProg.bind();
      gl.uniform1i(splatDyeProg.uniforms.uTarget, dye.read.attach(0));
      gl.uniform1f(splatDyeProg.uniforms.aspectRatio, canvas.width / Math.max(1, canvas.height));
      gl.uniform2f(splatDyeProg.uniforms.point, x, y);
      gl.uniform3f(splatDyeProg.uniforms.color, absorb[0], absorb[1], absorb[2]);
      gl.uniform1f(splatDyeProg.uniforms.radius, config.SPLAT_RADIUS * radiusMul);
      gl.uniform1f(splatDyeProg.uniforms.strength, strength);
      blit(dye.write);
      dye.swap();
    };
    // 一滴墨：墨核 + 帶切向偏移的放射水流，讓墨暈開成流線而非單純圓形
    const inkDrop = (x: number, y: number, absorb: [number, number, number], scale = 1) => {
      splatDye(x, y, absorb, 0.85 * scale, 2.6 * scale);
      const n = 8;
      const base = 40 * scale * rm;
      const swirl = (Math.random() < 0.5 ? 1 : -1) * 0.35;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        splatVelocity(
          x + ux * 0.012,
          y + uy * 0.012,
          (ux - uy * swirl) * base,
          (uy + ux * swirl) * base
        );
      }
    };

    /* ── 互動（事件綁 window，canvas 本身 pointer-events: none） ── */
    let currentInk = 0;
    let pointerActive = false; // 按住且起點不在互動元件上
    let lastUV = { x: 0.5, y: 0.5 };
    let hasHover = false;
    let lastInteract = performance.now();
    let lastHoverDye = 0;
    const markInteract = () => {
      lastInteract = performance.now();
    };

    const toUV = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return null;
      const x = (clientX - r.left) / r.width;
      const y = 1 - (clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return null;
      return { x, y };
    };
    const isInteractive = (target: EventTarget | null) =>
      target instanceof Element &&
      !!target.closest("a, button, input, textarea, select, label, summary, [role='button']");

    const onPointerDown = (e: PointerEvent) => {
      markInteract();
      const p = toUV(e.clientX, e.clientY);
      if (!p) return;
      lastUV = p;
      // 點在 CTA / Nav / 表單等互動元件上時不滴墨、不干擾原功能
      if (isInteractive(e.target)) return;
      pointerActive = true;
      currentInk = (currentInk + 1) % INKS.length;
      inkDrop(p.x, p.y, INKS[currentInk].absorb, 1);
    };
    const onPointerMove = (e: PointerEvent) => {
      markInteract();
      const p = toUV(e.clientX, e.clientY);
      if (!p) {
        hasHover = false;
        return;
      }
      const dx = p.x - lastUV.x;
      const dy = p.y - lastUV.y;
      hasHover = true;
      if (pointerActive) {
        // 拖曳：推動流體並留下墨痕
        splatVelocity(p.x, p.y, dx * config.SPLAT_FORCE, dy * config.SPLAT_FORCE);
        const dist = Math.hypot(dx, dy);
        splatDye(p.x, p.y, INKS[currentInk].absorb, Math.min(0.5, 0.15 + dist * 5), 2.0);
      } else {
        // 純移動：只有非常輕微的推力，偶爾一抹極淡墨暈
        splatVelocity(p.x, p.y, dx * config.SPLAT_FORCE * 0.12, dy * config.SPLAT_FORCE * 0.12);
        const now = performance.now();
        if (now - lastHoverDye > 2600 && Math.random() < 0.12) {
          lastHoverDye = now;
          splatDye(p.x, p.y, INKS[currentInk].absorb, 0.06, 3.2);
        }
      }
      lastUV = p;
    };
    const onPointerUp = () => {
      pointerActive = false;
      markInteract();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const t0 = e.touches[0];
      const p = toUV(t0.clientX, t0.clientY);
      markInteract();
      if (!p) return;
      const dx = p.x - lastUV.x;
      const dy = p.y - lastUV.y;
      splatVelocity(p.x, p.y, dx * config.SPLAT_FORCE * 0.35, dy * config.SPLAT_FORCE * 0.35);
      lastUV = p;
    };

    // 捲動：像水面被拉動 — 依 delta 注入輕微推力，快速下捲偶爾滴極淡墨
    let inView = true;
    let lastScrollY = window.scrollY;
    let lastScrollSplat = 0;
    let lastScrollDrop = 0;
    const onScroll = () => {
      const delta = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      if (!inView || delta === 0) return;
      const now = performance.now();
      if (now - lastScrollSplat < 90) return;
      lastScrollSplat = now;
      const x = hasHover ? lastUV.x : 0.54;
      const y = hasHover ? lastUV.y : 0.42;
      const mag = (Math.min(Math.abs(delta), 140) / 140) * 26 * rm;
      // 下捲內容上移 → 水面被往上拉；上捲只做反向輕流，不滴墨
      splatVelocity(x, y, (Math.random() - 0.5) * mag * 0.6, delta > 0 ? mag : -mag * 0.7);
      if (delta > 70 && now - lastScrollDrop > 1400 && Math.random() < 0.25) {
        lastScrollDrop = now;
        splatDye(x, y - 0.04, INKS[(currentInk + 1) % INKS.length].absorb, 0.18, 3.0);
      }
      markInteract();
    };

    /* ── 自動演出（節制） ── */
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timeouts.push(setTimeout(fn, ms));
    // 開場三滴（Hero 座標 → GL y 軸翻轉）
    later(() => inkDrop(0.32, 1 - 0.56, INKS[0].absorb, 1.05 * rm), 250);
    later(() => inkDrop(0.68, 1 - 0.38, INKS[1].absorb, 0.85), 700);
    later(() => inkDrop(0.54, 1 - 0.64, INKS[2].absorb, 0.8), 1200);

    let nextAuto = performance.now() + 5000;
    let nextAmbient = performance.now() + 1500;
    const autoPerform = (now: number) => {
      // 持續極輕水流，讓墨慢慢巡動、不完全靜止
      if (now > nextAmbient) {
        nextAmbient = now + (1800 + Math.random() * 2200) / rm;
        const a = Math.random() * Math.PI * 2;
        const mag = (3 + Math.random() * 5) * rm;
        splatVelocity(Math.random(), Math.random(), Math.cos(a) * mag, Math.sin(a) * mag);
      }
      // 閒置 3 秒後偶爾自動滴一滴淡墨
      if (now - lastInteract < 3000 || now < nextAuto) return;
      nextAuto = now + (7000 + Math.random() * 9000) / rm;
      const x = 0.15 + Math.random() * 0.7;
      const y = 0.22 + Math.random() * 0.55;
      const useGold = Math.random() < 0.12;
      const ink = useGold ? GOLD : INKS[Math.floor(Math.random() * INKS.length)].absorb;
      inkDrop(x, y, ink, (0.5 + Math.random() * 0.5) * rm);
      // 偶爾在附近補第二滴不同色
      if (Math.random() < 0.3) {
        const second = INKS[Math.floor(Math.random() * INKS.length)].absorb;
        later(
          () => inkDrop(x + (Math.random() - 0.5) * 0.16, y + (Math.random() - 0.5) * 0.12, second, 0.45 * rm),
          420
        );
      }
    };

    /* ── 洗い流す ── */
    washRef.current = () => {
      washing = true;
      washUntil = performance.now() + 1700;
      markInteract();
    };
    const updateWash = (now: number) => {
      if (!washing) return;
      if (Math.random() < 0.4) {
        const a = Math.random() * Math.PI * 2;
        const mag = 4 + Math.random() * 4;
        splatVelocity(Math.random(), Math.random(), Math.cos(a) * mag, Math.sin(a) * mag);
      }
      if (now > washUntil) washing = false;
    };

    /* ── 可視性 / 生命週期 ── */
    let hidden = document.hidden;
    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 }
    );
    io.observe(canvas);
    const onVisibility = () => {
      hidden = document.hidden;
      lastTime = performance.now();
    };

    const ro = new ResizeObserver(() => {
      const wasMobile = isMobile;
      isMobile = applyDeviceTier();
      if (resizeCanvas() || wasMobile !== isMobile) initFramebuffers();
    });
    ro.observe(canvas);

    /* ── 主迴圈 ── */
    let raf = 0;
    let lastTime = performance.now();
    let lastOffscreenTick = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      if (hidden) {
        lastTime = now;
        return;
      }
      // Hero 不在 viewport：降到約 5fps 維持極低負擔
      if (!inView && now - lastOffscreenTick < 200) return;
      lastOffscreenTick = now;
      let dt = (now - lastTime) / 1000;
      lastTime = now;
      dt = Math.min(dt, 1 / 30);
      autoPerform(now);
      updateWash(now);
      step(dt);
      render();
    };
    raf = requestAnimationFrame(frame);

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      timeouts.forEach(clearTimeout);
      washRef.current = null;
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      ro.disconnect();
      releaseFBOs();
      gl.deleteBuffer(quadBuf);
      gl.deleteBuffer(indexBuf);
      programs.forEach((p) => gl.deleteProgram(p));
      shaders.forEach((s) => gl.deleteShader(s));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [enabled]);

  if (!supported) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="hero-ink-canvas"
        data-active={enabled ? "true" : "false"}
        aria-hidden="true"
      />
      <div className="hero-ink-overlay" aria-hidden="true" />
      <div className="hero-ink-controls">
        <button
          type="button"
          className={`hero-ink-btn${enabled ? " on" : ""}`}
          aria-label={t("inkToggle")}
          aria-pressed={enabled}
          onClick={() => setEnabled((v) => !v)}
        >
          Ink
        </button>
        {enabled && (
          <button
            type="button"
            className="hero-ink-btn hero-ink-btn-clear"
            aria-label={t("inkClear")}
            onClick={() => washRef.current?.()}
          >
            Clear
          </button>
        )}
      </div>
    </>
  );
}
