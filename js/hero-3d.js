// Fundo 3D do hero — malha cromada girando (WebGL via Three.js), com
// reflexos coloridos (branco, laranja, vermelho) e leve resposta ao mouse.
// Se WebGL não estiver disponível, falha em silêncio e o hero fica só com
// o fundo preto + grid sutil (já definidos no CSS).
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

(() => {
  const canvas = document.getElementById("heroCanvas");
  const hero = canvas ? canvas.closest(".hero") : null;
  if (!canvas || !hero) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (err) {
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 4.4);

  const geometry = new THREE.TorusKnotGeometry(1.35, 0.42, 180, 24, 2, 3);
  const material = new THREE.MeshStandardMaterial({
    color: 0x060606,
    metalness: 1,
    roughness: 0.22,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(0.7, 0, 0.35);
  scene.add(mesh);

  scene.add(new THREE.AmbientLight(0x1a1a1a, 1));

  const keyLight = new THREE.PointLight(0xf9f9f9, 55, 25);
  keyLight.position.set(-3, 3, 5);
  scene.add(keyLight);

  const orangeLight = new THREE.PointLight(0xf16001, 70, 25);
  orangeLight.position.set(3, -1.5, 4);
  scene.add(orangeLight);

  const rimLight = new THREE.PointLight(0xc10801, 45, 25);
  rimLight.position.set(-1, -3, -4);
  scene.add(rimLight);

  let width, height;

  function resize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

  hero.addEventListener("pointermove", (e) => {
    const rect = hero.getBoundingClientRect();
    pointer.targetX = (e.clientX - rect.left) / rect.width - 0.5;
    pointer.targetY = (e.clientY - rect.top) / rect.height - 0.5;
  });

  function animate() {
    pointer.x += (pointer.targetX - pointer.x) * 0.05;
    pointer.y += (pointer.targetY - pointer.y) * 0.05;

    mesh.rotation.y += 0.0035;
    mesh.rotation.x = 0.7 + pointer.y * 0.25;
    mesh.rotation.z = 0.35 + pointer.x * 0.2;

    renderer.render(scene, camera);

    if (!prefersReducedMotion) requestAnimationFrame(animate);
  }

  resize();
  animate();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
})();
