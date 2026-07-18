// ═══════════════════════════════════════════════════════════════
// ADERVIS Homepage — Three.js 3D Hero
// Chrome при загрузке → плавно переходит в золото при скролле
// ═══════════════════════════════════════════════════════════════
(async () => {
  let THREE, SVGLoader, RoomEnvironment;
  try {
    [THREE, { SVGLoader }, { RoomEnvironment }] = await Promise.all([
      import('three'),
      import('three/addons/loaders/SVGLoader.js'),
      import('three/addons/environments/RoomEnvironment.js'),
    ]);
  } catch (e) {
    console.warn('[hero3d] Three.js CDN недоступен:', e.message);
    document.getElementById('heroCanvas')?.remove();
    return;
  }

const canvas = document.getElementById('heroCanvas');
if (!canvas) { console.warn('[hero3d] canvas#heroCanvas not found'); return; }

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
renderer.toneMappingExposure = 1.6;
renderer.outputColorSpace    = THREE.SRGBColorSpace;

// ─── Scene / Camera ─────────────────────────────────────────
const scene  = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 7;

// ─── Environment (металлические отражения) ──────────────────
const pmrem  = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.environment = envMap;
pmrem.dispose();

// ─── Освещение ──────────────────────────────────────────────
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

const underLight = new THREE.DirectionalLight(0xffd966, 1.5);
underLight.position.set(0, -8, 3);
scene.add(underLight);

// ─── Материал — хром в тёмной теме, золото в светлой ────────
const CHROME_COLOR = new THREE.Color(0xc0c0ba);
const GOLD_COLOR   = new THREE.Color(0xf6bd3a);
const isLightTheme = () => document.documentElement.getAttribute('data-theme') === 'light';

const mat = new THREE.MeshStandardMaterial({
  color:           isLightTheme() ? GOLD_COLOR.clone() : CHROME_COLOR.clone(),
  metalness:       1.0,
  roughness:       isLightTheme() ? 0.10 : 0.03,
  envMapIntensity: 3.5,
});

// ─── SVG иконки ─────────────────────────────────────────────
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2160 2160"><path d="M1580.87,1460.95c-2.86-28.37-37.65-89.84-65.61-144.16l-348.64-683.49s-16.06-36.74-39.16-57.23c-18.59-16.48-47.44-17.06-47.44-17.06,0,0-28.35-.15-46.95,16.34-23.13,20.5-39.21,57.25-39.21,57.25l-349.04,683.71c-27.99,54.33-62.82,115.83-65.68,144.21-4.06,40.31,13.99,84.78,76.91,73.39,58.44-10.57,220.37-74.81,220.18-74.86l203.79-82.04,204.09,82.48c-.19.05,161.56,64.28,219.93,74.84,62.85,11.38,80.88-33.07,76.83-73.37h0ZM1644.09,1652.56c-34.42,22.09-86.28,31.73-117.72,27.51-88.97-11.91-211.9-62.67-211.9-62.67l-234.45-93.41-234.23,92.8s-123,50.77-212.03,62.68c-31.46,4.21-83.35-5.42-117.8-27.51-132.9-85.25-70.29-244.9-65.96-256.84,4.51-12.45,442.71-865.15,453.9-885.17,11.19-20.02,40.7-52.42,81.67-73.39,43.38-22.19,94.45-24.57,94.45-24.57,6.52.47,54.47,4.74,94.75,25.36,40.94,20.95,70.44,53.35,81.62,73.37,11.18,20.02,449.11,872.59,453.62,885.04,4.33,11.94,66.89,171.57-65.93,256.8h.01Z"/></svg>`;

// ─── Парсинг SVG → 3D геометрия ─────────────────────────────
const svgLoader = new SVGLoader();
const svgData   = svgLoader.parse(ICON_SVG);
const group     = new THREE.Group();
const meshes    = [];

for (const path of svgData.paths) {
  const shapes = SVGLoader.createShapes(path);
  for (const shape of shapes) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth:          280,
      bevelEnabled:   true,
      bevelThickness: 28,
      bevelSize:      18,
      bevelSegments:  20,
      curveSegments:  48,
    });
    const m = new THREE.Mesh(geo, mat);
    meshes.push(m);
    group.add(m);
  }
}

// ─── Центрируем ──────────────────────────────────────────────
const combinedBox = new THREE.Box3();
meshes.forEach(m => {
  m.geometry.computeBoundingBox();
  combinedBox.union(m.geometry.boundingBox);
});
const localCenter = combinedBox.getCenter(new THREE.Vector3());
const localSize   = combinedBox.getSize(new THREE.Vector3());
meshes.forEach(m => {
  m.geometry.translate(-localCenter.x, -localCenter.y, -localCenter.z);
});

// ─── Масштаб ─────────────────────────────────────────────────
const maxDim = Math.max(localSize.x, localSize.y);
const s      = 2.8 / maxDim;

group.scale.set(s, -s, s);
scene.add(group);

// ─── Анимация появления ──────────────────────────────────────
// На десктопе — правая половина (x=2.2). На мобилке — ниже и меньше (декор)
let TARGET_X  = window.innerWidth > 900 ? 2.2 : 0;
let TARGET_Y  = window.innerWidth > 900 ? 0   : -1.2;
let MOB_SCALE = window.innerWidth > 900 ? 1.0 : 0.6;
let IS_MOBILE = window.innerWidth <= 900;

const entryScale = 0.42;
group.scale.set(s * entryScale * MOB_SCALE, -s * entryScale * MOB_SCALE, s * entryScale * MOB_SCALE);
group.position.y  = -0.8 + TARGET_Y;
group.position.x  = 0;
group.rotation.y  = -0.35;

// ─── Theme change observer — меняем начальный цвет при переключении ───
new MutationObserver(() => {
  if (scrollProgress < 0.1) {
    mat.color.copy(isLightTheme() ? GOLD_COLOR : CHROME_COLOR);
    mat.roughness = isLightTheme() ? 0.10 : 0.03;
  }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ─── Scroll → Chrome-to-Gold переход ────────────────────────
let scrollProgress = 0;
const SCROLL_DIST  = window.innerHeight * 0.8; // полный переход за 80% вьюпорта

window.addEventListener('scroll', () => {
  scrollProgress = Math.min(window.scrollY / SCROLL_DIST, 1);

  // В тёмной теме: chrome → gold. В светлой: gold → gold (без изменений)
  if (!isLightTheme()) {
    mat.color.lerpColors(CHROME_COLOR, GOLD_COLOR, scrollProgress);
  }

  // Шероховатость: 0.03 → 0.12
  mat.roughness = THREE.MathUtils.lerp(0.03, 0.12, scrollProgress);

  // Интенсивность env: 3.5 → 2.8
  mat.envMapIntensity = THREE.MathUtils.lerp(3.5, 2.8, scrollProgress);
  mat.needsUpdate = false; // color/roughness update без rebuild

  // Свет: холодный → тёплый
  const coldKey  = new THREE.Color(0xffffff);
  const warmKey  = new THREE.Color(0xfff8e0);
  keyLight.color.lerpColors(coldKey, warmKey, scrollProgress);
  keyLight.intensity = THREE.MathUtils.lerp(7, 6, scrollProgress);

  const coldFill = new THREE.Color(0x99aaff);
  const warmFill = new THREE.Color(0xd0e8ff);
  fillLight.color.lerpColors(coldFill, warmFill, scrollProgress);

  rimLight.color.set(scrollProgress > 0.5 ? 0xffe090 : 0xffffff);
  rimLight.intensity = THREE.MathUtils.lerp(5, 4, scrollProgress);

  underLight.intensity = THREE.MathUtils.lerp(1.5, 3, scrollProgress);
}, { passive: true });

// ─── Слежение за мышью ──────────────────────────────────────
let targetX = 0, targetY = 0;
let currentX = 0, currentY = 0;

window.addEventListener('mousemove', (e) => {
  targetX =  (e.clientX / window.innerWidth  - 0.5) * 1.1;
  targetY = -(e.clientY / window.innerHeight - 0.5) * 0.72;
}, { passive: true });

window.addEventListener('deviceorientation', (e) => {
  if (e.gamma != null) targetX =  (e.gamma / 40) * 0.6;
  if (e.beta  != null) targetY = -((e.beta - 45) / 55) * 0.4;
}, { passive: true });

// ─── Анимационный цикл ──────────────────────────────────────
// prefers-reduced-motion: рендерим модель один раз в её финальной позе,
// без непрерывного requestAnimationFrame (вращение мышью/бесконечное
// покачивание) — глобальный CSS-предохранитель гасит только CSS-анимации,
// на этот JS-цикл он не действует (WCAG 2.3.3, требование PRODUCT.md)
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let frame         = 0;
let entryProgress = 0;

function animate() {
  requestAnimationFrame(animate);
  frame++;

  currentX += (targetX - currentX) * 0.055;
  currentY += (targetY - currentY) * 0.055;

  if (entryProgress < 1) {
    entryProgress = Math.min(entryProgress + 0.009, 1);
    const t = 1 - Math.pow(1 - entryProgress, 3);

    const sf = entryScale + (1 - entryScale) * t;
    group.scale.set(s * sf * MOB_SCALE, -s * sf * MOB_SCALE, s * sf * MOB_SCALE);
    group.position.y   = (-0.8 + TARGET_Y) + 0.8 * t;
    group.position.x   = TARGET_X * t;
    group.rotation.y   = currentX - 0.35 * (1 - t);
    group.rotation.x   = currentY;
  } else {
    group.scale.set(s * MOB_SCALE, -s * MOB_SCALE, s * MOB_SCALE);
    if (IS_MOBILE) {
      // На мобильной нет курсора для параллакса — иконка вращается сама по кругу
      group.rotation.y = frame * 0.0065;
      group.rotation.x = currentY;
    } else {
      group.rotation.y = currentX;
      group.rotation.x = currentY;
    }
    group.position.y   = TARGET_Y + Math.sin(frame * 0.007) * 0.09;
    group.position.x   = TARGET_X;
  }

  renderer.render(scene, camera);
}

if (prefersReducedMotion) {
  // Финальная поза без входной анимации, без покачивания, без параллакса мыши
  group.scale.set(s * MOB_SCALE, -s * MOB_SCALE, s * MOB_SCALE);
  group.position.set(TARGET_X, TARGET_Y, 0);
  group.rotation.set(0, 0, 0);
  renderer.render(scene, camera);
} else {
  animate();
}

// ─── Ресайз ─────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  TARGET_X  = w > 900 ? 2.2 : 0;
  TARGET_Y  = w > 900 ? 0   : -1.2;
  MOB_SCALE = w > 900 ? 1.0 : 0.6;
  IS_MOBILE = w <= 900;
  group.position.x = TARGET_X;

  if (prefersReducedMotion) {
    group.scale.set(s * MOB_SCALE, -s * MOB_SCALE, s * MOB_SCALE);
    group.position.set(TARGET_X, TARGET_Y, 0);
    renderer.render(scene, camera);
  }
}, { passive: true });

})();
