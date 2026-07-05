// ═══════════════════════════════════════════════════════════════
// ADERVIS Video page — Three.js 3D play-button icon
// Сплошной диск (CylinderGeometry) + треугольник-стрелка сверху
// Красный металлик, цвет видео-раздела (#F52424)
// ═══════════════════════════════════════════════════════════════
(async () => {
  let THREE, RoomEnvironment;
  try {
    [THREE, { RoomEnvironment }] = await Promise.all([
      import('three'),
      import('three/addons/environments/RoomEnvironment.js'),
    ]);
  } catch (e) {
    console.warn('[hero3d-video] Three.js CDN недоступен:', e.message);
    document.getElementById('videoHeroCanvas')?.remove();
    return;
  }

  const canvas = document.getElementById('videoHeroCanvas');
  if (!canvas) return;

  // ─── Renderer ───────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.8;
  renderer.outputColorSpace    = THREE.SRGBColorSpace;

  // ─── Scene / Camera ─────────────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 7;

  // ─── Environment ─────────────────────────────────────────────
  const pmrem  = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environment = envMap;
  pmrem.dispose();

  // ─── Освещение (нейтральное для серебра, красное для hover-состояния) ──
  scene.add(new THREE.AmbientLight(0xffffff, 0.1));

  const keyLight = new THREE.DirectionalLight(0xffffff, 7);
  keyLight.position.set(5, 8, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x99aaff, 3);
  fillLight.position.set(-6, 1, 4);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 5);
  rimLight.position.set(0, -5, -7);
  scene.add(rimLight);

  // ─── Материалы ───────────────────────────────────────────────
  // Начало: серебро/хром (как 3D-логотип на главной)
  // Hover:  диск → красный, стрелка → белая
  const SILVER     = new THREE.Color(0xc0c0ba);
  const RED        = new THREE.Color(0xcc1212);
  const ARROW_REST = new THREE.Color(0xd8d8d4); // светлее серебро для стрелки
  const ARROW_HOV  = new THREE.Color(0xffffff);
  let hoverProgress = 0;

  // Диск — хром → красный при наведении
  const matDisk = new THREE.MeshStandardMaterial({
    color:           SILVER.clone(),
    metalness:       1.0,
    roughness:       0.04,
    envMapIntensity: 3.5,
  });

  // Стрелка — светлое серебро → белая при наведении
  const matArrow = new THREE.MeshStandardMaterial({
    color:           ARROW_REST.clone(),
    metalness:       0.8,
    roughness:       0.12,
    envMapIntensity: 2.5,
  });

  // ─── Диск (сплошной круг) ────────────────────────────────────
  // CylinderGeometry: radius=1, высота=0.18 (толщина диска), 64 сегмента
  const diskGeo = new THREE.CylinderGeometry(1, 1, 0.18, 64);
  // Поворачиваем чтобы плоская сторона смотрела на камеру (Z+)
  diskGeo.rotateX(Math.PI / 2);
  const diskMesh = new THREE.Mesh(diskGeo, matDisk);
  // Сдвигаем назад чтобы стрелка выступала вперёд
  diskMesh.position.z = -0.06;

  // ─── Треугольник-стрелка (play arrow) ────────────────────────
  // Простой ExtrudeGeometry без holes — не требует точного winding
  // Центроид сдвинут вправо для визуального баланса внутри круга
  const triShape = new THREE.Shape();
  triShape.moveTo(-0.24,  0.38);  // левый верхний
  triShape.lineTo(-0.24, -0.38);  // левый нижний
  triShape.lineTo( 0.52,  0);     // правый центр
  triShape.closePath();

  const triGeo = new THREE.ExtrudeGeometry(triShape, {
    depth:          0.12,
    bevelEnabled:   true,
    bevelThickness: 0.025,
    bevelSize:      0.018,
    bevelSegments:  10,
    curveSegments:  1,
  });
  // Центрируем по Z: extrude идёт от 0 до 0.12
  triGeo.translate(0, 0, -0.06);

  const triMesh = new THREE.Mesh(triGeo, matArrow);

  // ─── Группа ──────────────────────────────────────────────────
  const group = new THREE.Group();
  group.add(diskMesh);
  group.add(triMesh);
  scene.add(group);

  // ─── Позиция / масштаб ───────────────────────────────────────
  // ICON_SCALE = 0.55 — меньший размер (был 0.9)
  // TARGET_X = 1.3 → центр ~79% ширины экрана (16:9, FOV=40°, z=7)
  const ICON_SCALE = 0.55;
  let TARGET_X  = window.innerWidth > 900 ? 1.3 : 0;
  let TARGET_Y  = window.innerWidth > 900 ? 0   : -1.0;
  let MOB_SCALE = window.innerWidth > 900 ? 1.0 : 0.55;

  const ENTRY_SCALE = 0.42;
  group.scale.setScalar(ICON_SCALE * ENTRY_SCALE * MOB_SCALE);
  group.position.set(0, -0.8 + TARGET_Y, 0);
  group.rotation.y = -0.35;

  // ─── Слежение мышью ──────────────────────────────────────────
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  window.addEventListener('mousemove', (e) => {
    const pos = window.videoHeroIconPos;
    const refX = pos ? pos.cx / window.innerWidth  : 0.75;
    const refY = pos ? pos.cy / window.innerHeight : 0.50;
    targetX =  (e.clientX / window.innerWidth  - refX) * 1.6;
    targetY = -(e.clientY / window.innerHeight - refY) * 1.1;
  }, { passive: true });

  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma != null) targetX =  (e.gamma / 40) * 0.6;
    if (e.beta  != null) targetY = -((e.beta - 45) / 55) * 0.4;
  }, { passive: true });

  // ─── Анимационный цикл ───────────────────────────────────────
  // prefers-reduced-motion: без входной анимации, покачивания и
  // параллакса мыши/гироскопа — только статичная поза (WCAG 2.3.3).
  // Цикл продолжает работать, потому что считает позицию иконки для
  // HTML-оверлея кнопки play и её hover-цвет — это не пространственное
  // движение, а необходимая логика позиционирования и обратная связь.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let frame = 0, entryProgress = 0;
  const _c = new THREE.Vector3();
  const _e = new THREE.Vector3();

  function animate() {
    requestAnimationFrame(animate);
    frame++;

    const sc = ICON_SCALE * MOB_SCALE;

    if (prefersReducedMotion) {
      entryProgress = 1;
      group.scale.setScalar(sc);
      group.rotation.set(0, 0, 0);
      group.position.set(TARGET_X, TARGET_Y, 0);
    } else {
      currentX += (targetX - currentX) * 0.055;
      currentY += (targetY - currentY) * 0.055;

      if (entryProgress < 1) {
        entryProgress = Math.min(entryProgress + 0.009, 1);
        const t  = 1 - Math.pow(1 - entryProgress, 3);
        const sf = ENTRY_SCALE + (1 - ENTRY_SCALE) * t;
        group.scale.setScalar(sc * sf);
        group.position.y = (-0.8 + TARGET_Y) + 0.8 * t;
        group.position.x = TARGET_X * t;
        group.rotation.y = currentX - 0.35 * (1 - t);
        group.rotation.x = currentY;
      } else {
        group.scale.setScalar(sc);
        group.rotation.y = currentX;
        group.rotation.x = currentY;
        group.position.y = TARGET_Y + Math.sin(frame * 0.007) * 0.09;
        group.position.x = TARGET_X;
      }
    }

    // Hover: серебро → красный (диск) / светло-серебро → белая (стрелка)
    const th = window.videoHeroHovered ? 1 : 0;
    hoverProgress += (th - hoverProgress) * 0.06;
    matDisk.color.lerpColors(SILVER, RED, hoverProgress);
    matDisk.roughness = THREE.MathUtils.lerp(0.04, 0.18, hoverProgress);
    matArrow.color.lerpColors(ARROW_REST, ARROW_HOV, hoverProgress);

    // Координаты для HTML-оверлея
    group.getWorldPosition(_c);
    _c.project(camera);
    const cx = (_c.x + 1) / 2 * window.innerWidth;
    const cy = (-_c.y + 1) / 2 * window.innerHeight;

    const sc2 = ICON_SCALE * MOB_SCALE * (entryProgress < 1
      ? ENTRY_SCALE + (1 - ENTRY_SCALE) * (1 - Math.pow(1 - entryProgress, 3))
      : 1);
    _e.set(group.position.x + sc2, group.position.y, 0);
    _e.project(camera);
    const r = Math.abs((_e.x + 1) / 2 * window.innerWidth - cx);

    window.videoHeroIconPos = { cx, cy, r, ready: entryProgress >= 0.98 };

    renderer.render(scene, camera);
  }
  animate();

  // ─── Ресайз ──────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    TARGET_X  = w > 900 ? 1.3 : 0;
    TARGET_Y  = w > 900 ? 0   : -1.0;
    MOB_SCALE = w > 900 ? 1.0 : 0.55;
    group.position.x = TARGET_X;
  }, { passive: true });

})();
