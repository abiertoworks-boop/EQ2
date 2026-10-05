/* ==========================================================================
   感情のコア — 点と線のネットワーク球体（参考動画 2026-10-04 の動き）
   ・暗い点が球状に散らばり、近いもの同士が細い線でつながる
   ・外枠のワイヤーがランダムに熱せられて光る
   ・火花は黄色とオレンジで光り、少しずつ消える
   ・中央に青白い光の玉。ときどき中央から外へ青白い稲妻が走る
   ・足元に水面の波紋
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

  /* ---------- 外枠のワイヤーが、ランダムに熱せられて光る ---------- */
  var heat = new Float32Array(E), nodeH = new Float32Array(N), edgesOf = [];
  for (i = 0; i < N; i++) edgesOf.push([]);
  for (i = 0; i < E; i++) { edgesOf[pairs[i * 2]].push(i); edgesOf[pairs[i * 2 + 1]].push(i); }
  var isShell = [];
  for (i = 0; i < N; i++) isShell.push(base[i].length() > R0 * 0.88);
  var shellEdges = [];
  for (i = 0; i < E; i++) if (isShell[pairs[i * 2]] && isShell[pairs[i * 2 + 1]]) shellEdges.push(i);
  var igQ = [], heatWait = 0.2;
  var heatTex = radialTexture([[0, 'rgba(255,196,120,0.95)'], [0.3, 'rgba(255,120,30,0.65)'], [1, 'rgba(255,90,10,0)']]);
  var HG = 10, heatGlows = [], heatNext = 0;
  for (i = 0; i < HG; i++) {
    var hs = new THREE.Sprite(new THREE.SpriteMaterial({ map: heatTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    hs.renderOrder = 3; hs.scale.setScalar(0.5);
    hs.userData = { life: 0, max: 1, s: 0.5 };
    group.add(hs); heatGlows.push(hs);
  }

  /* 外殻のワイヤー1本を熱し、隣のワイヤーへ数本ぶん燃え広がらせる */
  function igniteCluster(now0) {
    if (!shellEdges.length) return;
    var e0 = shellEdges[Math.floor(Math.random() * shellEdges.length)];
    var seen = {}; seen[e0] = 1;
    igQ.push({ e: e0, at: now0, v: 1 });
    var frontier = [e0], hop = 0, maxHop = 3 + Math.floor(Math.random() * 3);
    while (hop < maxHop && frontier.length) {
      hop++;
      var nf = [];
      for (var fi = 0; fi < frontier.length; fi++) {
        var ef = frontier[fi];
        for (var side = 0; side < 2; side++) {
          var lst = edgesOf[pairs[ef * 2 + side]];
          for (var li = 0; li < lst.length; li++) {
            var e2 = lst[li];
            if (seen[e2] || !(isShell[pairs[e2 * 2]] && isShell[pairs[e2 * 2 + 1]]) || Math.random() > 0.66) continue;
            seen[e2] = 1; nf.push(e2);
            igQ.push({ e: e2, at: now0 + hop * 0.07, v: Math.max(0.35, 1 - hop * 0.15) });
          }
        }
      }
      frontier = nf;
    }
    var hg = heatGlows[heatNext]; heatNext = (heatNext + 1) % HG;
    var hn = pairs[e0 * 2];
    hg.position.set(pos[hn * 3], pos[hn * 3 + 1], pos[hn * 3 + 2]);
    hg.userData.life = hg.userData.max = 1.1 + Math.random() * 0.6;
    hg.userData.s = 0.55 + Math.random() * 0.4;
  }

  /* ---------- 火花（黄色とオレンジ。強く光って、少しずつ消える） ---------- */
  var SPARKS = isSmall ? 220 : 420;
  var spPos = new Float32Array(SPARKS * 3);
  var spCol = new Float32Array(SPARKS * 3);
  var spA = new Float32Array(SPARKS);
  var spS = new Float32Array(SPARKS);
  var spSeed = new Float32Array(SPARKS);
  var spVel = [], spLife = new Float32Array(SPARKS), spMax = new Float32Array(SPARKS), spBase = [];
  for (i = 0; i < SPARKS; i++) { spVel.push(new THREE.Vector3()); spBase.push(new THREE.Color()); spLife[i] = 0; spPos[i * 3 + 1] = 9999; spS[i] = 1; }
  var sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
  sparkGeo.setAttribute('aA', new THREE.BufferAttribute(spA, 1));
  sparkGeo.setAttribute('aS', new THREE.BufferAttribute(spS, 1));
  var sparkVert = [
    'attribute vec3 color; attribute float aA; attribute float aS; uniform float uScale; uniform float uSize;',
    'varying vec3 vC; varying float vA;',
    'void main(){ vC = color; vA = aA; vec4 mv = modelViewMatrix*vec4(position,1.0);',
    '  gl_PointSize = uSize * aS * uScale / -mv.z; gl_Position = projectionMatrix*mv; }'
  ].join('\n');
  /* 中心は白に近い黄色、まわりへ向けて黄色→オレンジ。外側はやわらかく溶ける */
  var sparkFrag = [
    'uniform float uAlpha; varying vec3 vC; varying float vA;',
    'void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float k = clamp(1.0 - d, 0.0, 1.0);',
    '  vec3 c = mix(vC, vec3(1.0,0.97,0.78), k*k*0.85);',
    '  gl_FragColor = vec4(c, vA * uAlpha * pow(k, 0.7)); }'
  ].join('\n');
  function sparkMaterial(sizeMul, alpha, additive) {
    return new THREE.ShaderMaterial({
      uniforms: { uScale: { value: viewH() * 0.5 * renderer.getPixelRatio() }, uSize: { value: sizeMul * (isSmall ? 0.12 : 0.1) }, uAlpha: { value: alpha } },
      vertexShader: sparkVert, fragmentShader: sparkFrag,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
  }
  var sparkGlowMat = sparkMaterial(3.2, 0.45, true), sparkCoreMat = sparkMaterial(1, 1, false);
  var sparkGlow = new THREE.Points(sparkGeo, sparkGlowMat);
  var sparks = new THREE.Points(sparkGeo, sparkCoreMat);
  sparkGlow.renderOrder = 4; sparks.renderOrder = 5;
  sparkGlow.frustumCulled = false; sparks.frustumCulled = false;
  group.add(sparkGlow); group.add(sparks);
  var spNext = 0;
  var SPARK_COLS = [new THREE.Color('#ffe45a'), new THREE.Color('#ffd23a'), new THREE.Color('#ffb52a'), new THREE.Color('#ff9a1f'), new THREE.Color('#ff7a10')];
  function emitSpark(at, power) {
    var k = spNext; spNext = (spNext + 1) % SPARKS;
    spPos[k * 3] = at.x; spPos[k * 3 + 1] = at.y; spPos[k * 3 + 2] = at.z;
    spVel[k].set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize().multiplyScalar(0.25 + Math.random() * power);
    spMax[k] = spLife[k] = 0.9 + Math.random() * 1.1;
    spSeed[k] = Math.random() * 10;
    spS[k] = 0.7 + Math.random() * 0.8;
    var oc = SPARK_COLS[Math.floor(Math.random() * SPARK_COLS.length)];
    spBase[k].copy(oc);
    spCol[k * 3] = oc.r; spCol[k * 3 + 1] = oc.g; spCol[k * 3 + 2] = oc.b;
    spA[k] = 1;
  }

  /* ---------- ときどき、網のどこかで火花が弾ける ---------- */
  var burstAt = 0, burstWait = 0.8 + Math.random() * 1.2;
  var burstDemo = params.has('burst');
  function sparkBurst(local) {
    for (var q = 0; q < 46; q++) emitSpark(local, 2.4);
  }

  /* ---------- 中央の青白い光の玉 ---------- */
  var core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(226,245,255,0.9)'], [0.45, 'rgba(150,210,255,0.45)'], [1, 'rgba(120,190,255,0)']]),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9
  }));
  core.scale.setScalar(1.1);
  core.renderOrder = 3;
  group.add(core);

  /* ---------- 中央から外へ走る青白い稲妻（カメラへ向けた帯。先が走り、根もとから順に消える） ---------- */
  var BOLT_SEGS = 110;
  var boltVert = [
    'attribute float aF; attribute float aU; varying float vF; varying float vU;',
    'void main(){ vF = aF; vU = aU; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
  ].join('\n');
  /* aF=根もと0〜先端1。uHeadまで伸び、uTailより根もと側は消えている。帯の端はやわらかく溶ける */
  var boltFrag = [
    'uniform vec3 uColor; uniform float uOp; uniform float uHead; uniform float uTail; uniform float uEdge;',
    'varying float vF; varying float vU;',
    'void main(){',
    '  float head = 1.0 - smoothstep(uHead - 0.07, uHead, vF);',
    '  float tail = smoothstep(uTail, uTail + 0.32, vF);',
    '  float edge = pow(max(1.0 - abs(vU), 0.0), uEdge);',
    '  gl_FragColor = vec4(uColor, uOp * head * tail * edge);',
    '}'
  ].join('\n');
  function makeBoltLayer(color, opacity, widthMul, edge, order) {
    var geo = new THREE.BufferGeometry();
    var p = new Float32Array(BOLT_SEGS * 12), af = new Float32Array(BOLT_SEGS * 4), au = new Float32Array(BOLT_SEGS * 4);
    var idx = new Uint16Array(BOLT_SEGS * 6);
    for (var s2 = 0; s2 < BOLT_SEGS; s2++) {
      var b0 = s2 * 4, o2 = s2 * 6;
      idx[o2] = b0; idx[o2 + 1] = b0 + 1; idx[o2 + 2] = b0 + 2; idx[o2 + 3] = b0 + 2; idx[o2 + 4] = b0 + 1; idx[o2 + 5] = b0 + 3;
      au[b0] = 1; au[b0 + 1] = -1; au[b0 + 2] = 1; au[b0 + 3] = -1;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('aF', new THREE.BufferAttribute(af, 1));
    geo.setAttribute('aU', new THREE.BufferAttribute(au, 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setDrawRange(0, 0);
    var mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOp: { value: opacity }, uHead: { value: 0 }, uTail: { value: -1 }, uEdge: { value: edge } },
      vertexShader: boltVert, fragmentShader: boltFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = order; mesh.frustumCulled = false;
    group.add(mesh);
    return { geo: geo, p: p, af: af, mat: mat, wm: widthMul, op: opacity };
  }
  var boltLayers = [
    makeBoltLayer(0x7ec4ff, 0.4, 3.6, 1.5, 6),
    makeBoltLayer(0x2f80ff, 0.95, 1.35, 0.45, 7),
    makeBoltLayer(0xeaf8ff, 1, 0.5, 0.35, 8)
  ];
  var boltSegs = [];
  var boltDemo = params.has('bolt');
  var BOLT_LIFE = 0.8;
  var boltT = 0, boltWait = boltDemo ? 0.2 : 1 + Math.random() * 1.8;
  var viewLocal = new THREE.Vector3(), segDir = new THREE.Vector3(), segSide = new THREE.Vector3(), segTo = new THREE.Vector3();

  function fireBolts() {
    boltSegs = [];
    var n = 4 + Math.floor(Math.random() * 3);
    for (var bi = 0; bi < n; bi++) {
      var node = Math.floor(Math.random() * N);
      var ex = pos[node * 3], ey = pos[node * 3 + 1], ez = pos[node * 3 + 2];
      var SEG = 8, px = 0, py = 0, pz = 0, mids = [];
      for (var s3 = 1; s3 <= SEG; s3++) {
        var f = s3 / SEG;
        var spread = 0.34 * (1 - Math.abs(f - 0.5) * 1.3);
        var nx2 = ex * f + (Math.random() - 0.5) * spread;
        var ny2 = ey * f + (Math.random() - 0.5) * spread;
        var nz2 = ez * f + (Math.random() - 0.5) * spread;
        boltSegs.push([px, py, pz, nx2, ny2, nz2, 1 - f * 0.45, (s3 - 1) / SEG, f]);
        if (s3 > 2 && s3 < SEG) mids.push([nx2, ny2, nz2, f]);
        px = nx2; py = ny2; pz = nz2;
      }
      /* 途中から細い枝が分かれる（枝も根もとに近い側から先に消える） */
      for (var br2 = 0; br2 < 2 && mids.length; br2++) {
        var m = mids[Math.floor(Math.random() * mids.length)];
        var qx = m[0], qy = m[1], qz = m[2];
        for (var s4 = 0; s4 < 3; s4++) {
          var rx = qx + (Math.random() - 0.5) * 0.3, ry = qy + (Math.random() - 0.5) * 0.3, rz = qz + (Math.random() - 0.5) * 0.3;
          boltSegs.push([qx, qy, qz, rx, ry, rz, 0.5 - s4 * 0.1, m[3] + s4 * 0.06, m[3] + (s4 + 1) * 0.06]);
          qx = rx; qy = ry; qz = rz;
        }
      }
      /* 稲妻の先が触れた点から、黄色とオレンジの火花を散らす */
      tmp.set(ex, ey, ez);
      for (var q = 0; q < 10; q++) emitSpark(tmp, 1.4);
    }
    if (boltSegs.length > BOLT_SEGS) boltSegs.length = BOLT_SEGS;
    boltT = BOLT_LIFE;
  }

  /* 稲妻の帯を、いまのカメラの向きに合わせて作り直す（head=どこまで伸びたか／tail=どこから消えたか） */
  function updateBolts(head, tail, flick) {
    viewLocal.copy(camera.position);
    group.worldToLocal(viewLocal);
    var segN = boltSegs.length;
    for (var li2 = 0; li2 < boltLayers.length; li2++) {
      var L = boltLayers[li2], P = L.p, AF = L.af;
      for (var si = 0; si < segN; si++) {
        var sg = boltSegs[si];
        segDir.set(sg[3] - sg[0], sg[4] - sg[1], sg[5] - sg[2]);
        segTo.copy(viewLocal).sub(segSide.set(sg[0], sg[1], sg[2]));
        segSide.crossVectors(segDir, segTo).normalize();
        var hw = 0.0243 * sg[6] * L.wm;
        var o3 = si * 12, a4 = si * 4;
        P[o3] = sg[0] + segSide.x * hw; P[o3 + 1] = sg[1] + segSide.y * hw; P[o3 + 2] = sg[2] + segSide.z * hw;
        P[o3 + 3] = sg[0] - segSide.x * hw; P[o3 + 4] = sg[1] - segSide.y * hw; P[o3 + 5] = sg[2] - segSide.z * hw;
        P[o3 + 6] = sg[3] + segSide.x * hw; P[o3 + 7] = sg[4] + segSide.y * hw; P[o3 + 8] = sg[5] + segSide.z * hw;
        P[o3 + 9] = sg[3] - segSide.x * hw; P[o3 + 10] = sg[4] - segSide.y * hw; P[o3 + 11] = sg[5] - segSide.z * hw;
        AF[a4] = sg[7]; AF[a4 + 1] = sg[7]; AF[a4 + 2] = sg[8]; AF[a4 + 3] = sg[8];
      }
      L.geo.attributes.position.needsUpdate = true;
      L.geo.attributes.aF.needsUpdate = true;
      L.geo.setDrawRange(0, segN * 6);
      L.mat.uniforms.uHead.value = head;
      L.mat.uniforms.uTail.value = tail;
      L.mat.uniforms.uOp.value = L.op * flick;
    }
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
    sparkGlowMat.uniforms.uScale.value = sparkCoreMat.uniforms.uScale.value = viewH() * 0.5 * renderer.getPixelRatio();
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
  var tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  var cA = new THREE.Color(), cH = new THREE.Color();
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

    /* 外枠のワイヤーを、ランダムに熱する（熱は広がりながら冷めていく） */
    if (!reduceMotion) {
      heatWait -= delta;
      if (heatWait <= 0) {
        heatWait = 0.18 + Math.random() * 0.4;
        igniteCluster(elapsed);
        if (Math.random() < 0.35) igniteCluster(elapsed + 0.05);
      }
    }
    for (i = igQ.length - 1; i >= 0; i--) {
      var ig = igQ[i];
      if (elapsed >= ig.at) {
        if (ig.v > heat[ig.e]) heat[ig.e] = ig.v;
        /* 熱せられたワイヤーから、ときどき火花が飛ぶ */
        if (!reduceMotion && Math.random() < 0.55) {
          var ea = pairs[ig.e * 2], ec = pairs[ig.e * 2 + 1];
          tmp.set((pos[ea * 3] + pos[ec * 3]) / 2, (pos[ea * 3 + 1] + pos[ec * 3 + 1]) / 2, (pos[ea * 3 + 2] + pos[ec * 3 + 2]) / 2);
          emitSpark(tmp, 0.9);
        }
        igQ.splice(i, 1);
      }
    }
    var cool = Math.exp(-delta * 1.35);
    for (i = 0; i < N; i++) nodeH[i] = 0;
    for (i = 0; i < E; i++) {
      var hv = heat[i] * cool;
      if (hv < 0.01) hv = 0;
      heat[i] = hv;
      if (hv > 0) {
        var ha0 = pairs[i * 2], hc0 = pairs[i * 2 + 1];
        if (hv > nodeH[ha0]) nodeH[ha0] = hv;
        if (hv > nodeH[hc0]) nodeH[hc0] = hv;
      }
    }
    heatGlows.forEach(function (hg) {
      var u = hg.userData;
      if (u.life > 0) {
        u.life -= delta;
        var hp = Math.max(0, u.life) / u.max;
        hg.material.opacity = Math.min(1, hp * 1.6) * 0.8;
        hg.scale.setScalar(u.s * (0.7 + (1 - hp) * 0.7));
      } else hg.material.opacity = 0;
    });

    /* ときどき、どこかで火花が弾ける */
    if (!reduceMotion) {
      burstWait -= delta;
      if (burstWait <= 0) {
        burstWait = burstDemo ? 0.6 : 0.9 + Math.random() * 1.6;
        burstAt = Math.floor(Math.random() * N);
        tmp.set(pos[burstAt * 3], pos[burstAt * 3 + 1], pos[burstAt * 3 + 2]);
        sparkBurst(tmp);
      }
    }

    /* 火花：外へ散りながら、きらめいて、少しずつ消える */
    for (i = 0; i < SPARKS; i++) {
      if (spLife[i] <= 0) continue;
      spLife[i] -= delta;
      var k3 = i * 3, fade = Math.max(0, spLife[i] / spMax[i]);
      spVel[i].y -= 0.28 * delta;
      spPos[k3] += spVel[i].x * delta; spPos[k3 + 1] += spVel[i].y * delta; spPos[k3 + 2] += spVel[i].z * delta;
      spVel[i].multiplyScalar(0.95);
      var tw = 0.82 + 0.18 * Math.sin(elapsed * 26 + spSeed[i]);
      spA[i] = Math.pow(fade, 1.5) * tw;
      if (spLife[i] <= 0) { spPos[k3 + 1] = 9999; spA[i] = 0; }
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.color.needsUpdate = true;
    sparkGeo.attributes.aA.needsUpdate = true;
    sparkGeo.attributes.aS.needsUpdate = true;

    /* 点：ゆっくり漂いながら、熱せられたところが灯る */
    var amp = now.amplitude + pointerBoost;
    var quiver = now.tremble * 0.05;
    for (i = 0; i < N; i++) {
      var b = base[i], d = drift[i];
      var wob = 1 + amp * 0.55 * Math.sin(t * now.speed * d.sp + d.ph1) + quiver * Math.sin(t * 9 + d.ph2);
      tmp.copy(b).multiplyScalar(wob);
      tmp.x += Math.sin(t * 0.4 * d.sp + d.ph2) * 0.06 * d.amp * (1 + amp * 2);
      tmp.y += Math.cos(t * 0.37 * d.sp + d.ph1) * 0.06 * d.amp * (1 + amp * 2);
      pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z;

      cA.copy(ember[i] ? EMBER : INK);
      var nh = nodeH[i];
      if (nh > 0) cA.lerp(cH.setRGB(1, 0.42 + 0.4 * nh, 0.08 + 0.4 * nh * nh), Math.min(1, nh * 1.3));
      col[i * 3] = cA.r; col[i * 3 + 1] = cA.g; col[i * 3 + 2] = cA.b;
    }
    nodeGeo.attributes.position.needsUpdate = true;
    nodeGeo.attributes.color.needsUpdate = true;

    /* 線：両端の色を受け継ぐ。熱せられた線は、オレンジ〜黄色に燃えて光る（ホバー中は枠の色が混ざる） */
    var hov = now.tremble * 0.7;
    for (i = 0; i < E; i++) {
      var a = pairs[i * 2], c = pairs[i * 2 + 1];
      var o = i * 6;
      lpos[o] = pos[a * 3]; lpos[o + 1] = pos[a * 3 + 1]; lpos[o + 2] = pos[a * 3 + 2];
      lpos[o + 3] = pos[c * 3]; lpos[o + 4] = pos[c * 3 + 1]; lpos[o + 5] = pos[c * 3 + 2];
      var hh = heat[i];
      var fa = 0.55 + hh * 0.5;
      lcol[o] = col[a * 3] * fa; lcol[o + 1] = col[a * 3 + 1] * fa; lcol[o + 2] = col[a * 3 + 2] * fa;
      lcol[o + 3] = col[c * 3] * fa; lcol[o + 4] = col[c * 3 + 1] * fa; lcol[o + 5] = col[c * 3 + 2] * fa;
      var hr = Math.min(1, hh * 1.7), hg2 = Math.min(0.8, hh * hh * 0.9 + hh * 0.3), hb = Math.min(0.3, hh * hh * hh * 0.4);
      var gr = hr * (1 - hov) + flareColor.r * hh * 1.3 * hov;
      var gg = hg2 * (1 - hov) + flareColor.g * hh * 1.3 * hov;
      var gb = hb * (1 - hov) + flareColor.b * hh * 1.3 * hov;
      gcol[o] = gr; gcol[o + 1] = gg; gcol[o + 2] = gb;
      gcol[o + 3] = gr; gcol[o + 4] = gg; gcol[o + 5] = gb;
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    glowGeo.attributes.position.needsUpdate = true;
    glowGeo.attributes.color.needsUpdate = true;

    /* 中央の青白い光：静かに呼吸し、ときどき稲妻を放つ */
    var flash = boltT > 0 ? Math.max(0, boltT - (BOLT_LIFE - 0.25)) / 0.25 : 0;
    core.scale.setScalar(0.95 + Math.sin(t * 0.8) * 0.08 + flash * 0.5);
    core.material.opacity = 0.75 + Math.sin(t * 0.8) * 0.1 + flash * 0.25;
    if (!reduceMotion) {
      boltWait -= delta;
      if (boltWait <= 0) { boltWait = boltDemo ? 0.9 : 1 + Math.random() * 1.8; fireBolts(); }
      if (boltT > 0) {
        boltT -= delta;
        var age = BOLT_LIFE - Math.max(0, boltT);
        /* 先端がすばやく走り抜けたあと、根もと（中心側）から先端へ向かって順に消えていく */
        var head = Math.min(1.25, age / 0.09 * 1.25);
        var k = Math.max(0, (age - 0.12) / (BOLT_LIFE - 0.12));
        var tail = boltDemo ? 0.25 : -0.32 + k * k * 1.7;
        updateBolts(head, tail, 0.88 + Math.random() * 0.12);
      } else if (boltSegs.length) {
        boltSegs = [];
        boltLayers.forEach(function (L) { L.geo.setDrawRange(0, 0); });
      }
    }

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
