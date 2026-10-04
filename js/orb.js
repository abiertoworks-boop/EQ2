/* ==========================================================================
   感情のコア — 点と線のネットワーク球体（参考動画 2026-10-04 の動き）
   ・暗い点が球状に散らばり、近いもの同士が細い線でつながる
   ・その網の中を金色の光がゆっくり巡り、通ったところの点と線が灯る
   ・うしろに煙のような暗い霞、足元に水面の波紋
   ・枠にホバーすると、光の色がその色に変わり、網全体が強く波立つ（穏やかな揺れ＋細かな震え）
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
  if (isSmall) group.scale.setScalar(0.72);

  function radialTexture(stops) {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(function (s) { grad.addColorStop(s[0], s[1]); });
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  /* ---------- 色 ---------- */
  var INK = new THREE.Color('#232838');        // 点と線のふだんの色
  var EMBER = new THREE.Color('#d4603a');      // ところどころ灯る赤い点
  var FLARE = new THREE.Color('#ffae4d');      // 網を巡る光（ホバーで色が変わる）
  var flareColor = FLARE.clone();
  var targetFlare = FLARE.clone();

  /* ---------- 点（ノード） ---------- */
  var R0 = 1.55;
  var N = isSmall ? 340 : 640;
  var base = [], drift = [], ember = [];
  var i, j;
  for (i = 0; i < N; i++) {
    var th = Math.random() * Math.PI * 2;
    var ph = Math.acos(Math.random() * 2 - 1);
    /* 外側の殻を細かく、中央にも点を増やして密度を上げる */
    var roll = Math.random();
    var rr = R0 * (roll < 0.58 ? (0.9 + Math.random() * 0.16)
      : roll < 0.84 ? (0.55 + Math.random() * 0.33)
        : (0.12 + Math.random() * 0.42));
    base.push(new THREE.Vector3(rr * Math.sin(ph) * Math.cos(th), rr * Math.sin(ph) * Math.sin(th), rr * Math.cos(ph)));
    drift.push({ sp: 0.25 + Math.random() * 0.6, ph1: Math.random() * 10, ph2: Math.random() * 10, amp: 0.5 + Math.random() });
    ember.push(Math.random() < 0.13);
  }

  var pos = new Float32Array(N * 3);
  var col = new Float32Array(N * 3);
  var siz = new Float32Array(N);
  var nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  nodeGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  var nodes = new THREE.Points(nodeGeo, new THREE.PointsMaterial({
    size: isSmall ? 0.07 : 0.055, sizeAttenuation: true, vertexColors: true,
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]),
    transparent: true, depthWrite: false, opacity: 0.95
  }));
  nodes.renderOrder = 2;
  group.add(nodes);

  /* ---------- 線（近い点どうしを結ぶ） ---------- */
  var LINK = R0 * 0.25, MAX_PER_NODE = 8;
  var pairs = [], count = new Int16Array(N);
  for (i = 0; i < N; i++) {
    for (j = i + 1; j < N; j++) {
      if (count[i] >= MAX_PER_NODE || count[j] >= MAX_PER_NODE) continue;
      if (base[i].distanceTo(base[j]) < LINK) { pairs.push(i, j); count[i]++; count[j]++; }
    }
  }
  var E = pairs.length / 2;
  var lpos = new Float32Array(E * 6);
  var lcol = new Float32Array(E * 6);
  var lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lcol, 3));
  var lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false
  }));
  lines.renderOrder = 1;
  group.add(lines);

  /* 光が触れている枠だけを、重ねてはっきり光らせる（光が当たっていない線は真っ黒＝加算で見えない） */
  var gcol = new Float32Array(E * 6);
  var glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  glowGeo.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
  var glowLines = new THREE.LineSegments(glowGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  glowLines.renderOrder = 4;
  group.add(glowLines);

  /* ---------- 網を巡る光 ---------- */
  var FLARES = isSmall ? 2 : 3;
  var flareTex = radialTexture([[0, 'rgba(255,255,255,0.95)'], [0.25, 'rgba(255,196,120,0.75)'], [0.6, 'rgba(255,150,60,0.25)'], [1, 'rgba(255,140,60,0)']]);
  var flares = [];
  for (i = 0; i < FLARES; i++) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
    s.scale.setScalar(0.6);
    s.renderOrder = 3;
    s.userData = {
      p: new THREE.Vector3(), prev: new THREE.Vector3(),
      a: Math.random() * Math.PI * 2, b: Math.random() * Math.PI * 2,
      va: 0.5 + Math.random() * 0.45, vb: 0.36 + Math.random() * 0.4,
      r: R0 * (0.5 + Math.random() * 0.5), ph: Math.random() * 10
    };
    group.add(s);
    flares.push(s);
  }

  /* ---------- 火花（光が動くたびに少し散る／ときどき小さく弾ける） ---------- */
  var SPARKS = isSmall ? 90 : 160;
  var spPos = new Float32Array(SPARKS * 3);
  var spCol = new Float32Array(SPARKS * 3);
  var spVel = [], spLife = new Float32Array(SPARKS), spMax = new Float32Array(SPARKS);
  for (i = 0; i < SPARKS; i++) { spVel.push(new THREE.Vector3()); spLife[i] = 0; spPos[i * 3 + 1] = 9999; }
  var sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
  var sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
    size: isSmall ? 0.075 : 0.06, sizeAttenuation: true, vertexColors: true, blending: THREE.AdditiveBlending,
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,220,160,0.85)'], [1, 'rgba(255,180,90,0)']]),
    transparent: true, depthWrite: false
  }));
  sparks.renderOrder = 5;
  group.add(sparks);
  var spNext = 0;
  function emitSpark(at, power, color) {
    var k = spNext; spNext = (spNext + 1) % SPARKS;
    spPos[k * 3] = at.x; spPos[k * 3 + 1] = at.y; spPos[k * 3 + 2] = at.z;
    spVel[k].set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize().multiplyScalar(0.25 + Math.random() * power);
    spMax[k] = spLife[k] = 0.45 + Math.random() * 0.6;
    spCol[k * 3] = color.r; spCol[k * 3 + 1] = color.g; spCol[k * 3 + 2] = color.b;
  }

  /* ときどき、網のどこかで光が小さく弾ける */
  var burstTex = radialTexture([[0, 'rgba(255,255,255,0.95)'], [0.3, 'rgba(255,214,150,0.6)'], [1, 'rgba(255,170,80,0)']]);
  var burst = new THREE.Sprite(new THREE.SpriteMaterial({ map: burstTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  burst.renderOrder = 6;
  burst.scale.setScalar(0.5);
  group.add(burst);
  var burstAt = 0, burstT = 0, burstWait = 1.5 + Math.random() * 2.5;

  /* ---------- うしろの霞（煙のような暗い雲） ---------- */
  var smokeTex = radialTexture([[0, 'rgba(40,44,58,0.26)'], [0.45, 'rgba(40,44,58,0.13)'], [1, 'rgba(40,44,58,0)']]);
  var smoke = [];
  for (i = 0; i < 8; i++) {
    var sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0.5 + Math.random() * 0.35 }));
    var sr = R0 * (0.5 + Math.random() * 0.9);
    var sth = Math.random() * Math.PI * 2, sph = Math.acos(Math.random() * 2 - 1);
    sm.position.set(sr * Math.sin(sph) * Math.cos(sth), sr * Math.sin(sph) * Math.sin(sth), sr * Math.cos(sph) - 0.4);
    sm.scale.setScalar(2.2 + Math.random() * 2.4);
    sm.userData = { base: sm.position.clone(), sp: 0.1 + Math.random() * 0.25, off: Math.random() * 10 };
    sm.renderOrder = 0;
    group.add(sm);
    smoke.push(sm);
  }

  /* ---------- うしろのやわらかな光 ---------- */
  var halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(248,246,252,0.55)'], [1, 'rgba(240,240,248,0)']]),
    transparent: true, depthWrite: false
  }));
  halo.scale.set(7.2, 7.2, 1);
  halo.position.z = -1.6;
  halo.renderOrder = -2;
  group.add(halo);

  /* ---------- 水面の波紋 ---------- */
  var rippleUniforms = { uTime: { value: 0 }, uAgit: { value: 0 }, uOpacity: { value: 1 } };
  var ripple = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: rippleUniforms, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: [
        'uniform float uTime; uniform float uAgit; uniform float uOpacity; varying vec2 vUv;',
        'void main(){',
        '  vec2 p = (vUv - 0.5) * 18.0;',
        '  float r = length(p);',
        '  float k = 2.6 + uAgit*1.2;',
        '  float w = sin(r*k - uTime*(1.1 + uAgit*3.0));',
        '  float fade = smoothstep(8.5, 1.6, r) * smoothstep(0.3, 1.6, r);',
        '  float dark = smoothstep(0.6, 1.0, w) * 0.09;',
        '  float light = (1.0 - smoothstep(-1.0, -0.55, w)) * 0.5;',
        '  vec3 cl = mix(vec3(1.0), vec3(0.28,0.3,0.4), dark / max(dark + light, 0.0001));',
        '  float a = (dark + light*0.3) * fade;',
        '  gl_FragColor = vec4(cl, clamp(a, 0.0, 1.0) * uOpacity);',
        '}'
      ].join('\n')
    })
  );
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = -2.05;
  ripple.renderOrder = -1;
  group.add(ripple);

  /* ---------- 小さな丸（ぼけ） ---------- */
  var BUBBLES = isSmall ? 10 : 18;
  var bubbleTex = radialTexture([[0, 'rgba(255,255,255,0.9)'], [0.6, 'rgba(236,233,247,0.5)'], [0.92, 'rgba(190,185,220,0.35)'], [1, 'rgba(190,185,220,0)']]);
  var bubbleGroup = new THREE.Group();
  var bubbles = [];
  for (i = 0; i < BUBBLES; i++) {
    var bs = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthWrite: false, opacity: 0.4 + Math.random() * 0.35 }));
    var br = 2.6 + Math.random() * 4;
    var bth = Math.random() * Math.PI * 2, bph = Math.acos(Math.random() * 2 - 1);
    bs.position.set(br * Math.sin(bph) * Math.cos(bth), br * Math.sin(bph) * Math.sin(bth) * 0.7 + 0.3, br * Math.cos(bph) * 0.6);
    var bz = 0.05 + Math.pow(Math.random(), 3) * 0.26;
    bs.scale.set(bz, bz, 1);
    bs.userData = { base: bs.position.clone(), speed: 0.2 + Math.random() * 0.5, off: Math.random() * 10 };
    bubbleGroup.add(bs);
    bubbles.push(bs);
  }
  scene.add(bubbleGroup);

  /* ---------- 動きの値 ---------- */
  var DEFAULT = { speed: 0.55, amplitude: 0.1, frequency: 1.05 };
  var target = { speed: DEFAULT.speed, amplitude: DEFAULT.amplitude, frequency: DEFAULT.frequency, tremble: 0, depth: 0 };
  var now = { speed: DEFAULT.speed, amplitude: DEFAULT.amplitude, frequency: DEFAULT.frequency, tremble: 0 };
  var pointerBoost = 0;

  var pointerTarget = { x: 0, y: 0 };
  var lastPointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (e) {
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    var ny = (e.clientY / window.innerHeight) * 2 - 1;
    pointerTarget.x = ny * 0.5; pointerTarget.y = nx * 0.6;
    var v = Math.hypot(nx - lastPointer.x, ny - lastPointer.y);
    pointerBoost = Math.min(pointerBoost + v * 1.2, 0.25);
    lastPointer = { x: nx, y: ny };
  }, { passive: true });

  function onResize() {
    isSmall = window.matchMedia('(max-width:768px)').matches;
    camera.aspect = window.innerWidth / viewH();
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, viewH());
  }
  window.addEventListener('resize', onResize);

  /* ホバー時：旧版より39%穏やかな波立ち（28%＋さらに15%）＋細かな震え */
  var CALM = 0.61;
  function setTarget(hex, amplitude, speed, frequency) {
    targetFlare = new THREE.Color(hex);
    target.amplitude = (amplitude == null ? 0.42 : amplitude) * CALM;
    target.speed = (speed == null ? 1.3 : speed) * CALM;
    target.frequency = frequency == null ? 1.6 : frequency;
    target.tremble = 1;
    target.depth = 0.7;
  }
  function reset() {
    targetFlare = FLARE.clone();
    target.speed = DEFAULT.speed; target.amplitude = DEFAULT.amplitude; target.frequency = DEFAULT.frequency;
    target.tremble = 0; target.depth = 0;
  }

  /* セクションごとの濃さ・横位置・奥行き（data-orb / data-orb-x / data-orb-z） */
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
    return Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
  }

  /* ---------- 毎フレームの計算 ---------- */
  var tmp = new THREE.Vector3();
  var cA = new THREE.Color(), cB = new THREE.Color();
  var depthNow = 0;
  var clock = new THREE.Clock();
  var elapsed = capture ? 6 : 0;

  function frame() {
    var delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta;
    var ms = reduceMotion ? 0.15 : 1;
    var t = elapsed * ms;

    now.speed += (target.speed - now.speed) * 0.03;
    now.amplitude += (target.amplitude - now.amplitude) * 0.03;
    now.frequency += (target.frequency - now.frequency) * 0.03;
    now.tremble += (target.tremble - now.tremble) * 0.05;
    pointerBoost *= 0.94;
    flareColor.lerp(targetFlare, 0.04);
    rippleUniforms.uTime.value = t;
    rippleUniforms.uAgit.value = Math.min(1, Math.max(0, (now.amplitude - DEFAULT.amplitude) * 3));

    /* 光の位置（網の中を巡る）。明るさは一定にして、動いた分だけ火花を散らす */
    var beat = 1;
    flares.forEach(function (f) {
      var u = f.userData;
      u.prev.copy(u.p);
      u.a += delta * u.va * (0.8 + now.speed * 1.6) * ms;
      u.b += delta * u.vb * (0.8 + now.speed * 1.6) * ms;
      var rr = u.r * (0.85 + 0.15 * Math.sin(t * 0.9 + u.ph));
      u.p.set(rr * Math.sin(u.b) * Math.cos(u.a), rr * Math.sin(u.b) * Math.sin(u.a), rr * Math.cos(u.b));
      f.position.copy(u.p);
      f.material.color.copy(flareColor);
      f.scale.setScalar(0.5 + now.amplitude * 0.8);
      f.material.opacity = 0.6;
      /* 動いた距離に応じて、通り道に火花を置く */
      var moved = u.p.distanceTo(u.prev);
      if (!reduceMotion && moved > 0.012 && Math.random() < Math.min(0.9, moved * 14)) emitSpark(u.p, 0.5, flareColor);
    });

    /* ときどき、どこかで光が小さく弾ける */
    if (!reduceMotion) {
      burstWait -= delta;
      if (burstWait <= 0) {
        burstWait = 1.6 + Math.random() * 3.4;
        burstAt = Math.floor(Math.random() * N);
        burstT = 0.55;
        for (j = 0; j < 14; j++) {
          tmp.set(pos[burstAt * 3], pos[burstAt * 3 + 1], pos[burstAt * 3 + 2]);
          emitSpark(tmp, 1.4, flareColor);
        }
      }
      if (burstT > 0) {
        burstT -= delta;
        var bp = Math.max(0, burstT) / 0.55;
        burst.position.set(pos[burstAt * 3], pos[burstAt * 3 + 1], pos[burstAt * 3 + 2]);
        burst.material.color.copy(flareColor);
        burst.scale.setScalar(0.35 + (1 - bp) * 1.5);
        burst.material.opacity = bp * 0.9;
      } else burst.material.opacity = 0;
    }

    /* 火花：外へ散りながら消える */
    for (i = 0; i < SPARKS; i++) {
      if (spLife[i] <= 0) continue;
      spLife[i] -= delta;
      var k3 = i * 3, fade = Math.max(0, spLife[i] / spMax[i]);
      spPos[k3] += spVel[i].x * delta; spPos[k3 + 1] += spVel[i].y * delta; spPos[k3 + 2] += spVel[i].z * delta;
      spVel[i].multiplyScalar(0.94);
      spCol[k3] = flareColor.r * fade; spCol[k3 + 1] = flareColor.g * fade * 0.95; spCol[k3 + 2] = flareColor.b * fade * 0.8;
      if (spLife[i] <= 0) { spPos[k3 + 1] = 9999; spCol[k3] = spCol[k3 + 1] = spCol[k3 + 2] = 0; }
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.color.needsUpdate = true;

    /* 点：ゆっくり漂いながら、光に近いところが灯る */
    var amp = now.amplitude + pointerBoost;
    var quiver = now.tremble * 0.05 * beat;
    var sigma2 = 0.42 * 0.42;
    for (i = 0; i < N; i++) {
      var b = base[i], d = drift[i];
      var wob = 1 + amp * 0.55 * Math.sin(t * now.speed * d.sp + d.ph1) + quiver * Math.sin(t * 9 + d.ph2);
      tmp.copy(b).multiplyScalar(wob);
      tmp.x += Math.sin(t * 0.4 * d.sp + d.ph2) * 0.06 * d.amp * (1 + amp * 2);
      tmp.y += Math.cos(t * 0.37 * d.sp + d.ph1) * 0.06 * d.amp * (1 + amp * 2);
      pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z;

      var lit = 0;
      for (j = 0; j < flares.length; j++) {
        var fp = flares[j].userData.p;
        var dx = tmp.x - fp.x, dy = tmp.y - fp.y, dz = tmp.z - fp.z;
        lit += Math.exp(-(dx * dx + dy * dy + dz * dz) / sigma2);
      }
      lit = Math.min(1, lit * (0.9 + beat * 0.4));
      cA.copy(ember[i] ? EMBER : INK).lerp(flareColor, lit * 0.95);
      if (lit > 0.6) cA.lerp(cB.setRGB(1, 1, 1), (lit - 0.6) * 1.2);
      col[i * 3] = cA.r; col[i * 3 + 1] = cA.g; col[i * 3 + 2] = cA.b;
      siz[i] = lit;
    }
    nodeGeo.attributes.position.needsUpdate = true;
    nodeGeo.attributes.color.needsUpdate = true;

    /* 線：両端の色を受け継ぐ */
    for (i = 0; i < E; i++) {
      var a = pairs[i * 2], c = pairs[i * 2 + 1];
      var o = i * 6;
      lpos[o] = pos[a * 3]; lpos[o + 1] = pos[a * 3 + 1]; lpos[o + 2] = pos[a * 3 + 2];
      lpos[o + 3] = pos[c * 3]; lpos[o + 4] = pos[c * 3 + 1]; lpos[o + 5] = pos[c * 3 + 2];
      var fa = 0.55 + siz[a] * 0.6, fc = 0.55 + siz[c] * 0.6;
      lcol[o] = col[a * 3] * fa; lcol[o + 1] = col[a * 3 + 1] * fa; lcol[o + 2] = col[a * 3 + 2] * fa;
      lcol[o + 3] = col[c * 3] * fc; lcol[o + 4] = col[c * 3 + 1] * fc; lcol[o + 5] = col[c * 3 + 2] * fc;
      /* 光が触れている枠だけ、上から加算で光らせる（触れていない枠は黒＝見えない） */
      var ga = siz[a] * siz[a] * 1.5, gc = siz[c] * siz[c] * 1.5;
      gcol[o] = flareColor.r * ga; gcol[o + 1] = flareColor.g * ga; gcol[o + 2] = flareColor.b * ga;
      gcol[o + 3] = flareColor.r * gc; gcol[o + 4] = flareColor.g * gc; gcol[o + 5] = flareColor.b * gc;
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    glowGeo.attributes.position.needsUpdate = true;
    glowGeo.attributes.color.needsUpdate = true;

    /* 霞：ゆっくり漂う */
    smoke.forEach(function (sm) {
      var u = sm.userData;
      sm.position.x = u.base.x + Math.sin(t * u.sp + u.off) * 0.25 * ms;
      sm.position.y = u.base.y + Math.cos(t * u.sp * 0.8 + u.off) * 0.2 * ms;
    });

    /* 全体の回転と漂い */
    group.rotation.y += delta * (0.07 + now.speed * 0.05) * ms;
    group.rotation.x += (pointerTarget.x * 0.35 - group.rotation.x) * 0.02;
    group.rotation.z = Math.sin(t * 0.13) * 0.07 * ms;

    var floatY = Math.sin(t * 0.5) * 0.12 * ms;
    var floatX = Math.sin(t * 0.33) * 0.07 * ms;
    var wantX = (isSmall ? 0 : offsetX) + hoverX + floatX + pointerTarget.y * 0.25;
    group.position.x += (wantX - group.position.x) * 0.04;
    var wantY = (isSmall ? 2.25 : 0) + floatY;
    group.position.y += (wantY - group.position.y) * 0.05;

    depthNow += (target.depth - depthNow) * 0.04;
    var breathZ = Math.sin(t * 0.21) * 0.9 * ms + Math.sin(t * 0.53) * 0.25 * ms;
    group.position.z += ((offsetZ + breathZ + depthNow) - group.position.z) * 0.035;

    bubbles.forEach(function (bb) {
      var u = bb.userData;
      var par = (u.base.z + 3) * 0.12;
      bb.position.y = u.base.y + Math.sin(t * u.speed + u.off) * 0.25 * ms - pointerTarget.x * par;
      bb.position.x = u.base.x + Math.cos(t * u.speed * 0.7 + u.off) * 0.15 * ms + pointerTarget.y * par;
    });
    bubbleGroup.rotation.y += delta * 0.02 * ms;

    var want = CAM_FAR + (CAM_NEAR - CAM_FAR) * zoomProgress();
    camZ += (want - camZ) * 0.08;
    camera.position.z = camZ + Math.sin(t * 0.13) * 0.3 * ms;
    camera.position.x = Math.sin(t * 0.09) * 0.25 * ms;
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
    /* 色を付けて波立たせ、離れたら戻す（ホバー用の近道） */
    bind: function (el, hex, amp, speed, freq) {
      if (!el) return;
      el.addEventListener('mouseenter', function () { setTarget(hex, amp, speed, freq); boost(); });
      el.addEventListener('mouseleave', function () { reset(); restore(); });
      el.addEventListener('focus', function () { setTarget(hex, amp, speed, freq); boost(); });
      el.addEventListener('blur', function () { reset(); restore(); });
    }
  };
})();
