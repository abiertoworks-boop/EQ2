/* ==========================================================================
   感情のコア — ガラスの球体（参考動画の模様）
   ・芯は桃〜紫、縁は虹色の薄い殻が何枚も重なってゆらぐ
   ・足元に水面の波紋
   ・枠にホバーすると色が変わって揺れる（旧版より28%穏やか＋鼓動のように強まる細かな震え）
   ・足元の紫の映り込みは、画面に紫が残って見えるため外した
   ・球体は奥へ離れ、手前へ戻る奥行きの動きを続ける
   外から使う関数は window.EQOrb にまとめて公開する。
   ========================================================================== */
(function () {
  var canvas = document.getElementById('core-canvas');
  if (!canvas || !window.THREE) return;

  var params = new URLSearchParams(location.search);
  var capture = params.has('capture');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isSmall = window.matchMedia('(max-width:768px)').matches;
  function viewH() { return capture ? 900 : window.innerHeight; }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: capture });
  } catch (e) { canvas.style.display = 'none'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, viewH());
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / viewH(), 0.1, 100);
  var CAM_FAR = 9.5, CAM_NEAR = 5.4;
  camera.position.set(0, 0.7, CAM_FAR);
  camera.lookAt(0, -0.2, 0);

  var group = new THREE.Group();
  scene.add(group);
  if (isSmall) group.scale.setScalar(0.78);

  /* ---------- ノイズ（頂点シェーダー共通） ---------- */
  var NOISE = [
    'vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }',
    'vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }',
    'vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }',
    'vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }',
    'float snoise(vec3 v){',
    '  const vec2 C = vec2(1.0/6.0,1.0/3.0); const vec4 D = vec4(0.0,0.5,1.0,2.0);',
    '  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);',
    '  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;',
    '  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);',
    '  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;',
    '  i=mod289(i);',
    '  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));',
    '  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;',
    '  vec4 j=p-49.0*floor(p*ns.z*ns.z);',
    '  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);',
    '  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;',
    '  vec4 h=1.0-abs(x)-abs(y);',
    '  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);',
    '  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0;',
    '  vec4 sh=-step(h,vec4(0.0));',
    '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    '  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);',
    '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    '  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;',
    '  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;',
    '  return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
    '}'
  ].join('\n');

  var VERT = [
    'uniform float uTime, uSpeed, uAmplitude, uFrequency, uPointerBoost, uPhase, uLag, uTremble;',
    'varying vec3 vN; varying vec3 vV; varying float vDisp; varying float vSwirl;',
    NOISE,
    'float field(vec3 p){ return snoise(p*uFrequency + vec3(uTime*uSpeed*uLag + uPhase)); }',
    'vec3 displace(vec3 p){ vec3 n = normalize(p); float beat = 0.45 + 0.55 * pow(abs(sin(uTime * 3.1)), 6.0); float q = snoise(n*8.0 + vec3(uTime*9.0 + uPhase)) * 0.042 * uTremble * beat; return p + n * (field(n*1.35) * (uAmplitude + uPointerBoost) + q); }',
    'void main(){',
    '  vec3 p = position; vec3 n = normalize(p);',
    '  vec3 up = abs(n.y) < 0.99 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);',
    '  vec3 t = normalize(cross(n, up)); vec3 b = cross(n, t);',
    '  float e = 0.03;',
    '  vec3 p0 = displace(p); vec3 p1 = displace(p + t*e); vec3 p2 = displace(p + b*e);',
    '  vec3 dn = normalize(cross(p1 - p0, p2 - p0));',
    '  if (dot(dn, n) < 0.0) dn = -dn;',
    '  vDisp = length(p0) - length(p);',
    '  vSwirl = snoise(n*1.7 + vec3(0.0, uTime*0.22, uTime*0.11) + uPhase) * 0.5 + 0.5;',
    '  vec4 mv = modelViewMatrix * vec4(p0, 1.0);',
    '  vV = normalize(-mv.xyz);',
    '  vN = normalize(normalMatrix * dn);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  /* 芯（中身の色）と殻（虹色の縁の線）を uCore で切り替える */
  var FRAG = [
    'uniform vec3 uColor; uniform vec3 uColor2; uniform float uTime; uniform float uCore; uniform float uOpacity;',
    'varying vec3 vN; varying vec3 vV; varying float vDisp; varying float vSwirl;',
    'vec3 pal(float t){ return 0.5 + 0.5*cos(6.28318*(vec3(0.0,0.33,0.67) + t)); }',
    'void main(){',
    '  float facing = clamp(abs(dot(vN, vV)), 0.0, 1.0);',
    '  float fres = 1.0 - facing;',
    '  vec3 irid = mix(vec3(1.0), pal(fres*0.9 + vDisp*2.5 + uTime*0.04), 0.5);',
    '  vec3 lav = vec3(0.86, 0.85, 0.98);',
    '  vec3 col; float a;',
    '  if (uCore > 0.5) {',
    '    vec3 inner = mix(uColor, uColor2, smoothstep(0.2, 0.85, vSwirl));',
    '    float core = pow(facing, 1.8);',
    '    col = mix(lav, inner, core*0.92);',
    '    col = mix(col, irid, pow(fres, 2.0)*0.55);',
    '    col = mix(col, vec3(0.45,0.4,0.82), pow(fres, 7.0)*0.55);',
    '    a = 0.26 + core*0.6 + pow(fres, 3.0)*0.45;',
    '  } else {',
    '    col = mix(vec3(0.5,0.46,0.86), irid, 0.45);',
    '    col = mix(col, uColor, 0.18);',
    '    a = pow(fres, 5.0)*0.62 + pow(fres, 1.5)*0.05;',
    '  }',
    '  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uOpacity);',
    '}'
  ].join('\n');

  var DEFAULT = { color: new THREE.Color('#b85ad6'), speed: 0.55, amplitude: 0.1, frequency: 1.05 };
  var target = { color: DEFAULT.color.clone(), speed: DEFAULT.speed, amplitude: DEFAULT.amplitude, frequency: DEFAULT.frequency };
  var LAV = new THREE.Color('#8f93f2');

  var shared = {
    uTime: { value: 0 }, uSpeed: { value: target.speed }, uAmplitude: { value: target.amplitude },
    uFrequency: { value: target.frequency }, uPointerBoost: { value: 0 }, uTremble: { value: 0 },
    uColor: { value: target.color.clone() }, uColor2: { value: LAV.clone() }
  };

  var geo = isSmall ? new THREE.SphereGeometry(1.35, 72, 54) : new THREE.SphereGeometry(1.35, 160, 120);
  var meshes = [];
  // [scale, phase, lag, isCore, opacity]
  var LAYERS = [
    [1.00, 0.0, 1.00, 1, 1.0],
    [1.07, 3.1, 0.82, 0, 0.9],
    [1.12, 7.4, 0.66, 0, 0.55],
    [0.96, 11.2, 1.2, 0, 0.75],
    [1.18, 15.8, 0.5, 0, 0.3]
  ];
  LAYERS.forEach(function (L, i) {
    var u = {
      uTime: shared.uTime, uSpeed: shared.uSpeed, uAmplitude: shared.uAmplitude, uFrequency: shared.uFrequency,
      uPointerBoost: shared.uPointerBoost, uTremble: shared.uTremble, uColor: shared.uColor, uColor2: shared.uColor2,
      uPhase: { value: L[1] }, uLag: { value: L[2] }, uCore: { value: L[3] }, uOpacity: { value: L[4] }
    };
    var mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: u,
      transparent: true, depthWrite: false, side: THREE.FrontSide
    });
    var m = new THREE.Mesh(geo, mat);
    m.scale.setScalar(L[0]);
    m.renderOrder = i;
    group.add(m);
    meshes.push(m);
  });

  /* ---------- 後ろのやわらかな光 ---------- */
  function radialTexture(stops) {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(function (s) { grad.addColorStop(s[0], s[1]); });
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    var t = new THREE.CanvasTexture(c);
    return t;
  }
  var halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,0.95)'], [0.35, 'rgba(246,242,255,0.7)'], [0.7, 'rgba(236,232,252,0.22)'], [1, 'rgba(236,232,252,0)']]),
    transparent: true, depthWrite: false
  }));
  halo.scale.set(6.4, 6.4, 1);
  halo.position.z = -1.4;
  halo.renderOrder = -2;
  group.add(halo);

  /* ---------- 水面の波紋と映り込み ---------- */
  var rippleUniforms = {
    uTime: shared.uTime, uColor: shared.uColor, uAgit: { value: 0 }, uOpacity: { value: 1 }
  };
  var ripple = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: rippleUniforms, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: [
        'uniform float uTime; uniform vec3 uColor; uniform float uAgit; uniform float uOpacity; varying vec2 vUv;',
        'void main(){',
        '  vec2 p = (vUv - 0.5) * 18.0;',
        '  float r = length(p);',
        '  float k = 2.6 + uAgit*1.2;',
        '  float w = sin(r*k - uTime*(1.1 + uAgit*3.0));',
        '  float fade = smoothstep(8.5, 1.6, r) * smoothstep(0.3, 1.6, r);',
        '  float dark = smoothstep(0.6, 1.0, w) * 0.09;',
        '  float light = (1.0 - smoothstep(-1.0, -0.55, w)) * 0.55;',
        '  vec3 col = mix(vec3(1.0), vec3(0.42,0.43,0.66), dark / max(dark + light, 0.0001));',
        '  float a = (dark + light*0.35) * fade;',
        '  float refl = exp(-r*r*0.32);',
                        '  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uOpacity);',
        '}'
      ].join('\n')
    })
  );
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = -2.05;
  ripple.renderOrder = -1;
  group.add(ripple);

  /* ---------- 小さな丸（旧：星座の点と線） ---------- */
  var BUBBLES = isSmall ? 16 : 28;
  var bubbleTex = radialTexture([[0, 'rgba(255,255,255,0.95)'], [0.55, 'rgba(226,220,250,0.75)'], [0.8, 'rgba(160,150,230,0.35)'], [0.93, 'rgba(140,130,220,0.5)'], [1, 'rgba(140,130,220,0)']]);
  var bubbleGroup = new THREE.Group();
  var bubbles = [];
  for (var i = 0; i < BUBBLES; i++) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthWrite: false, opacity: 0.55 + Math.random() * 0.4 }));
    var r = 2.4 + Math.random() * 4.2;
    var th = Math.random() * Math.PI * 2;
    var ph = Math.acos(Math.random() * 2 - 1);
    s.position.set(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.7 + 0.3, r * Math.cos(ph) * 0.6);
    var size = 0.05 + Math.pow(Math.random(), 3) * 0.28;
    s.scale.set(size, size, 1);
    s.userData = { base: s.position.clone(), speed: 0.2 + Math.random() * 0.5, off: Math.random() * 10 };
    bubbleGroup.add(s);
    bubbles.push(s);
  }
  scene.add(bubbleGroup);

  /* ---------- 操作 ---------- */
  var pointerTarget = { x: 0, y: 0 };
  var lastPointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (e) {
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    var ny = (e.clientY / window.innerHeight) * 2 - 1;
    pointerTarget.x = ny * 0.5; pointerTarget.y = nx * 0.6;
    var v = Math.hypot(nx - lastPointer.x, ny - lastPointer.y);
    shared.uPointerBoost.value = Math.min(shared.uPointerBoost.value + v * 1.2, 0.25);
    lastPointer = { x: nx, y: ny };
  }, { passive: true });

  function onResize() {
    isSmall = window.matchMedia('(max-width:768px)').matches;
    camera.aspect = window.innerWidth / viewH();
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, viewH());
  }
  window.addEventListener('resize', onResize);

  /* ホバー時の揺れ：旧版より28%穏やか（20%→さらに10%）。代わりに、鼓動のように強まる細かな「震え」を重ねる（心が震える） */
  var CALM = 0.72;
  function setTarget(hex, amplitude, speed, frequency) {
    target.color = new THREE.Color(hex);
    target.amplitude = (amplitude == null ? 0.42 : amplitude) * CALM;
    target.speed = (speed == null ? 1.3 : speed) * CALM;
    target.frequency = frequency == null ? 1.6 : frequency;
    target.tremble = 1;
    target.depth = 0.7;
  }
  function reset() {
    target = { color: DEFAULT.color.clone(), speed: DEFAULT.speed, amplitude: DEFAULT.amplitude, frequency: DEFAULT.frequency, tremble: 0, depth: 0 };
  }
  target.tremble = 0; target.depth = 0;

  /* セクションごとの濃さと位置（data-orb="濃さ" data-orb-x="横位置"） */
  var baseOpacity = 1;
  var offsetX = 0, offsetZ = 0, hoverX = 0;
  function applySection(sec) {
    baseOpacity = parseFloat(sec.getAttribute('data-orb') || '1');
    offsetX = parseFloat(sec.getAttribute('data-orb-x') || '0');
    offsetZ = parseFloat(sec.getAttribute('data-orb-z') || '0');
    canvas.style.opacity = String(baseOpacity);
  }
  var sections = [].slice.call(document.querySelectorAll('[data-orb]'));
  if (sections.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      var best = null;
      entries.forEach(function (en) { if (en.isIntersecting && (!best || en.intersectionRatio > best.intersectionRatio)) best = en; });
      if (best) applySection(best.target);
    }, { threshold: [0.2, 0.45, 0.7] });
    sections.forEach(function (s) { io.observe(s); });
    applySection(sections[0]);
  }
  function boost(v) { canvas.style.opacity = String(v == null ? 0.85 : v); }
  function restore() { canvas.style.opacity = String(baseOpacity); }

  /* ヒーローをスクロールすると、球体へ近づいていく */
  var camZ = CAM_FAR;
  var hero = document.querySelector('[data-orb-zoom]');
  function zoomProgress() {
    if (!hero || reduceMotion) return hero ? 1 : 0;
    var rect = hero.getBoundingClientRect();
    var p = -rect.top / Math.max(1, rect.height);
    return Math.min(1, Math.max(0, p));
  }

  var depthNow = 0;
  var clock = new THREE.Clock();
  var elapsed = capture ? 6 : 0;
  function frame() {
    var delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta;
    var ms = reduceMotion ? 0.15 : 1;

    shared.uTime.value = elapsed * ms;
    shared.uSpeed.value += (target.speed - shared.uSpeed.value) * 0.03;
    shared.uAmplitude.value += (target.amplitude - shared.uAmplitude.value) * 0.03;
    shared.uFrequency.value += (target.frequency - shared.uFrequency.value) * 0.03;
    shared.uColor.value.lerp(target.color, 0.03);
    shared.uColor2.value.copy(shared.uColor.value).lerp(LAV, 0.55);
    shared.uPointerBoost.value *= 0.94;
    shared.uTremble.value += (target.tremble - shared.uTremble.value) * 0.05;
    rippleUniforms.uAgit.value = Math.min(1, Math.max(0, (shared.uAmplitude.value - DEFAULT.amplitude) * 3));

    meshes.forEach(function (m, i) {
      m.rotation.x += (pointerTarget.x - m.rotation.x) * (0.04 - i * 0.005);
      m.rotation.y += (pointerTarget.y - m.rotation.y) * (0.04 - i * 0.005);
      m.rotation.z += delta * 0.02 * (i % 2 ? -1 : 1) * ms;
    });

    var floatY = Math.sin(elapsed * 0.5) * 0.12 * ms;
    var floatX = Math.sin(elapsed * 0.33) * 0.07 * ms;
    var wantX = (isSmall ? 0 : offsetX) + hoverX + floatX;
    group.position.x += (wantX - group.position.x) * 0.04;
    var wantY = (isSmall ? 1.7 : 0);
    group.position.y += (wantY - group.position.y) * 0.05;

    /* 奥行きの動き：球体がゆっくり奥へ離れ、手前へ戻ってくる。
       セクションごとの奥行き（data-orb-z）と、ホバーで手前へ寄る動きも重ねる */
    depthNow += (target.depth - depthNow) * 0.04;
    var breathZ = Math.sin(elapsed * 0.21) * 0.9 * ms + Math.sin(elapsed * 0.53) * 0.25 * ms;
    var wantZ = offsetZ + breathZ + depthNow;
    group.position.z += (wantZ - group.position.z) * 0.035;
    group.rotation.y = Math.sin(elapsed * 0.17) * 0.25 * ms;
    group.rotation.x = Math.sin(elapsed * 0.11) * 0.06 * ms;
    meshes.forEach(function (m) { m.position.y = floatY; });
    halo.position.y = floatY;

    /* 泡は3つの奥行きの層にいて、指の動きに合わせて近いものほど大きくずれる（視差） */
    bubbles.forEach(function (b) {
      var u = b.userData;
      var par = (u.base.z + 3) * 0.12;
      b.position.y = u.base.y + Math.sin(elapsed * u.speed + u.off) * 0.25 * ms - pointerTarget.x * par;
      b.position.x = u.base.x + Math.cos(elapsed * u.speed * 0.7 + u.off) * 0.15 * ms + pointerTarget.y * par;
      b.position.z = u.base.z + Math.sin(elapsed * u.speed * 0.4 + u.off) * 0.8 * ms;
    });
    bubbleGroup.rotation.y += delta * 0.02 * ms;

    var want = CAM_FAR + (CAM_NEAR - CAM_FAR) * zoomProgress();
    camZ += (want - camZ) * 0.08;
    camera.position.z = camZ + Math.sin(elapsed * 0.13) * 0.3 * ms;
    camera.position.x = Math.sin(elapsed * 0.09) * 0.25 * ms;
    camera.lookAt(0, -0.2, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();

  window.EQOrb = {
    setTarget: setTarget,
    reset: reset,
    boost: boost,
    restore: restore,
    setOffsetX: function (v) { hoverX = v; },
    /* 色を付けて激しく動かし、離れたら戻す（ホバー用の近道） */
    bind: function (el, hex, amp, speed, freq) {
      if (!el) return;
      el.addEventListener('mouseenter', function () { setTarget(hex, amp, speed, freq); boost(); });
      el.addEventListener('mouseleave', function () { reset(); restore(); });
      el.addEventListener('focus', function () { setTarget(hex, amp, speed, freq); boost(); });
      el.addEventListener('blur', function () { reset(); restore(); });
    }
  };
})();
