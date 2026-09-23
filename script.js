(function () {
  var wrap = document.querySelector(".falls");
  if (!wrap) return;

  var img = wrap.querySelector(".falls-photo");
  var canvas = wrap.querySelector(".falls-canvas");
  var toggle = document.querySelector(".scene-toggle");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var PHOTO_W = 1024;
  var PHOTO_H = 682;
  var FLOW_W = 256;
  var FLOW_H = Math.round((FLOW_W * PHOTO_H) / PHOTO_W);

  // Outline of the bear and its rock in photo pixels; everything inside stays still.
  var BEAR = [
    [116, 300], [126, 262], [150, 226], [192, 192], [250, 162], [300, 138],
    [345, 120], [396, 118], [442, 136], [482, 163], [520, 192], [552, 222],
    [572, 226], [584, 240], [580, 258], [592, 292], [602, 332], [608, 370],
    [614, 396], [600, 412], [574, 410], [546, 394], [510, 372], [478, 352],
    [470, 392], [472, 440], [494, 468], [518, 486], [516, 508], [522, 536],
    [530, 562], [548, 604], [540, 622], [516, 604], [482, 574], [440, 538],
    [400, 504], [360, 474], [318, 448], [290, 432], [248, 412], [200, 382],
    [152, 348], [120, 322]
  ];
  var WATERMARK = [14, 626, 200, 674];

  // Water here sweeps right, then down over the lip; used to pick a direction along each streak.
  var PRIOR_X = 0.41;
  var PRIOR_Y = 0.91;

  var STRENGTH = 0.06;
  var SPEED = 0.9;
  var SHIMMER = 0.25;

  var gl = null;
  var uTime = null;
  var playing = false;
  var visible = true;
  var started = false;
  var clockOffset = 0;
  var pausedAt = 0;
  var rafId = 0;

  function smooth(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function boxBlur(src, w, h, r, passes) {
    var tmp = new Float32Array(src.length);
    var out = src;
    for (var p = 0; p < passes; p++) {
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var sum = 0;
          var n = 0;
          for (var k = -r; k <= r; k++) {
            var xx = x + k;
            if (xx < 0 || xx >= w) continue;
            sum += out[y * w + xx];
            n++;
          }
          tmp[y * w + x] = sum / n;
        }
      }
      var next = new Float32Array(src.length);
      for (var y2 = 0; y2 < h; y2++) {
        for (var x2 = 0; x2 < w; x2++) {
          var sum2 = 0;
          var n2 = 0;
          for (var k2 = -r; k2 <= r; k2++) {
            var yy = y2 + k2;
            if (yy < 0 || yy >= h) continue;
            sum2 += tmp[yy * w + x2];
            n2++;
          }
          next[y2 * w + x2] = sum2 / n2;
        }
      }
      out = next;
    }
    return out;
  }

  function stillMask() {
    var c = document.createElement("canvas");
    c.width = FLOW_W;
    c.height = FLOW_H;
    var ctx = c.getContext("2d");
    var s = FLOW_W / PHOTO_W;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    BEAR.forEach(function (pt, i) {
      if (i === 0) ctx.moveTo(pt[0] * s, pt[1] * s);
      else ctx.lineTo(pt[0] * s, pt[1] * s);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(
      WATERMARK[0] * s,
      WATERMARK[1] * s,
      (WATERMARK[2] - WATERMARK[0]) * s,
      (WATERMARK[3] - WATERMARK[1]) * s
    );
    var data = ctx.getImageData(0, 0, FLOW_W, FLOW_H).data;
    var m = new Float32Array(FLOW_W * FLOW_H);
    for (var i = 0; i < m.length; i++) m[i] = data[i * 4] / 255;
    return boxBlur(m, FLOW_W, FLOW_H, 1, 2);
  }

  // Long-exposure water is made of streaks; their orientation (from the image's
  // structure tensor) gives the local flow direction.
  function buildFlow(image) {
    var w = FLOW_W;
    var h = FLOW_H;
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var ctx = c.getContext("2d");
    ctx.drawImage(image, 0, 0, w, h);
    var px = ctx.getImageData(0, 0, w, h).data;

    var lum = new Float32Array(w * h);
    for (var i = 0; i < lum.length; i++) {
      lum[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
    }

    var jxx = new Float32Array(w * h);
    var jxy = new Float32Array(w * h);
    var jyy = new Float32Array(w * h);
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var o = y * w + x;
        var gx =
          lum[o - w + 1] + 2 * lum[o + 1] + lum[o + w + 1] -
          lum[o - w - 1] - 2 * lum[o - 1] - lum[o + w - 1];
        var gy =
          lum[o + w - 1] + 2 * lum[o + w] + lum[o + w + 1] -
          lum[o - w - 1] - 2 * lum[o - w] - lum[o - w + 1];
        jxx[o] = gx * gx;
        jxy[o] = gx * gy;
        jyy[o] = gy * gy;
      }
    }
    jxx = boxBlur(jxx, w, h, 4, 2);
    jxy = boxBlur(jxy, w, h, 4, 2);
    jyy = boxBlur(jyy, w, h, 4, 2);

    var still = stillMask();
    var fx = new Float32Array(w * h);
    var fy = new Float32Array(w * h);
    for (var j = 0; j < w * h; j++) {
      var a = jxx[j] - jyy[j];
      var b = 2 * jxy[j];
      var theta = 0.5 * Math.atan2(b, a);
      var dx = -Math.sin(theta);
      var dy = Math.cos(theta);
      var coherence = Math.sqrt(a * a + b * b) / (jxx[j] + jyy[j] + 1e-6);
      var d = dx * PRIOR_X + dy * PRIOR_Y;
      if (d < 0) {
        dx = -dx;
        dy = -dy;
        d = -d;
      }
      var mag = smooth(0.08, 0.45, coherence) * (0.35 + 0.65 * smooth(0, 0.35, d));
      fx[j] = dx * mag;
      fy[j] = dy * mag;
    }
    fx = boxBlur(fx, w, h, 2, 2);
    fy = boxBlur(fy, w, h, 2, 2);

    var out = new Uint8Array(w * h * 4);
    for (var k = 0; k < w * h; k++) {
      var water = 1 - still[k];
      out[k * 4] = Math.round((fx[k] * 0.5 + 0.5) * 255);
      out[k * 4 + 1] = Math.round((fy[k] * 0.5 + 0.5) * 255);
      out[k * 4 + 2] = Math.round(water * 255);
      out[k * 4 + 3] = 255;
    }
    return out;
  }

  var VERT =
    "attribute vec2 aPos;" +
    "varying vec2 vUv;" +
    "void main(){" +
    "  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);" +
    "  gl_Position = vec4(aPos, 0.0, 1.0);" +
    "}";

  var FRAG =
    "#ifdef GL_FRAGMENT_PRECISION_HIGH\n" +
    "precision highp float;\n" +
    "#else\n" +
    "precision mediump float;\n" +
    "#endif\n" +
    "varying vec2 vUv;" +
    "uniform sampler2D uImg;" +
    "uniform sampler2D uFlow;" +
    "uniform float uTime;" +
    "uniform float uStrength;" +
    "uniform float uSpeed;" +
    "uniform float uShimmer;" +
    "uniform vec2 uAspect;" +
    "uniform vec2 uSize;" +
    "float hash(vec2 p){" +
    "  vec3 p3 = fract(vec3(p.xyx) * 0.1031);" +
    "  p3 += dot(p3, p3.yzx + 33.33);" +
    "  return fract((p3.x + p3.y) * p3.z);" +
    "}" +
    "float noise(vec2 p){" +
    "  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);" +
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x)," +
    "             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);" +
    "}" +
    "float streak(vec2 q, vec2 dir){" +
    "  float s = 0.0;" +
    "  for (int k = 0; k < 10; k++) {" +
    "    s += noise((q - dir * (float(k) * 5.5)) / 3.4);" +
    "  }" +
    "  return s / 10.0;" +
    "}" +
    "vec3 waterAt(vec2 uv, vec3 fallback){" +
    "  float w = texture2D(uFlow, uv).b;" +
    "  return mix(fallback, texture2D(uImg, uv).rgb, w);" +
    "}" +
    "void main(){" +
    "  vec4 fl = texture2D(uFlow, vUv);" +
    "  vec3 base = texture2D(uImg, vUv).rgb;" +
    "  float water = fl.b;" +
    "  if (water < 0.004) { gl_FragColor = vec4(base, 1.0); return; }" +
    "  vec2 f = fl.rg * 2.0 - 1.0;" +
    "  float mag = length(f);" +
    "  vec2 dir = mag > 0.001 ? f / mag : vec2(0.0, 1.0);" +
    "  float t = uTime * uSpeed + noise(vUv * vec2(5.0, 3.5)) * 0.9;" +
    "  float p0 = fract(t);" +
    "  float p1 = fract(t + 0.5);" +
    "  float blend = abs(1.0 - 2.0 * p0);" +
    "  vec2 d = f * uStrength * uAspect;" +
    "  vec3 c0 = waterAt(vUv - d * p0, base);" +
    "  vec3 c1 = waterAt(vUv - d * p1, base);" +
    "  vec3 c = mix(c0, c1, blend);" +
    "  vec2 p = (vUv - 0.5) * uSize;" +
    "  vec2 dpx = f * uStrength * uSize.x;" +
    "  float s = mix(streak(p - dpx * p0, dir), streak(p - dpx * p1 + 91.7, dir), blend);" +
    "  float lum = dot(c, vec3(0.299, 0.587, 0.114));" +
    "  c += (s - 0.5) * uShimmer * clamp(mag * 1.6, 0.0, 1.0) * smoothstep(0.3, 0.85, lum);" +
    "  gl_FragColor = vec4(mix(base, c, water), 1.0);" +
    "}";

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  function texture(unit, setData) {
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    setData();
    return tex;
  }

  function setup() {
    gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return false;

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var flow = buildFlow(img);
    texture(0, function () {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    });
    texture(1, function () {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FLOW_W, FLOW_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, flow);
    });

    gl.uniform1i(gl.getUniformLocation(prog, "uImg"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "uFlow"), 1);
    gl.uniform1f(gl.getUniformLocation(prog, "uStrength"), STRENGTH);
    gl.uniform1f(gl.getUniformLocation(prog, "uSpeed"), SPEED);
    gl.uniform1f(gl.getUniformLocation(prog, "uShimmer"), SHIMMER);
    gl.uniform2f(gl.getUniformLocation(prog, "uAspect"), 1, PHOTO_W / PHOTO_H);
    gl.uniform2f(gl.getUniformLocation(prog, "uSize"), PHOTO_W, PHOTO_H);
    uTime = gl.getUniformLocation(prog, "uTime");
    gl.viewport(0, 0, canvas.width, canvas.height);
    return true;
  }

  function now() {
    return performance.now() / 1000;
  }

  function draw() {
    gl.uniform1f(uTime, now() - clockOffset);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame() {
    rafId = 0;
    if (!playing || !visible) return;
    draw();
    rafId = requestAnimationFrame(frame);
  }

  function kick() {
    if (!rafId && playing && visible) rafId = requestAnimationFrame(frame);
  }

  function play() {
    if (playing) return;
    clockOffset += now() - pausedAt;
    playing = true;
    toggle.textContent = "Pause";
    kick();
  }

  function pause() {
    if (!playing) return;
    playing = false;
    pausedAt = now();
    toggle.textContent = "Play";
  }

  function start() {
    if (started || reduceMotion.matches) return;
    try {
      if (!setup()) return;
    } catch (err) {
      return;
    }
    started = true;
    clockOffset = now();
    pausedAt = clockOffset;
    draw();
    wrap.classList.add("is-flowing");
    toggle.hidden = false;
    play();
  }

  toggle.addEventListener("click", function () {
    if (playing) pause();
    else play();
  });

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", function () {
      if (reduceMotion.matches) {
        pause();
        wrap.classList.remove("is-flowing");
        toggle.hidden = true;
      } else if (started) {
        wrap.classList.add("is-flowing");
        toggle.hidden = false;
        play();
      } else {
        start();
      }
    });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      kick();
    }).observe(wrap);
  }

  if (img.complete && img.naturalWidth) start();
  else img.addEventListener("load", start, { once: true });
})();
