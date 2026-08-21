// Fundo 3D do hero — malha cromada girando e ondulando (WebGL via
// Three.js), com wireframe brilhante por cima e ambiente procedural (gera
// reflexo de luz na paleta da marca) pra dar aspecto de metal líquido de
// verdade. Se WebGL não estiver disponível (ou falhar por qualquer motivo:
// driver de vídeo, bloqueio de extensão etc.), falha em silêncio e o
// gradiente CSS do hero (ver style.css) fica visível no lugar.
import * as THREE from "../assets/vendor/three.module.js";

(() => {
  const canvas = document.getElementById("heroCanvas");
  const hero = canvas ? canvas.closest(".hero") : null;
  if (!canvas || !hero) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (err) {
    console.warn("[hero-3d] WebGL indisponível, usando fundo CSS de reserva:", err);
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 4.4);

  // Ambiente procedural (gradiente preto/branco/laranja/vermelho) usado
  // como reflexo — é o que dá o aspecto de metal líquido/cromado.
  function makeEnvTexture() {
    const size = 256;
    const envCanvas = document.createElement("canvas");
    envCanvas.width = size;
    envCanvas.height = size;
    const c = envCanvas.getContext("2d");
    const grad = c.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, "#050505");
    grad.addColorStop(0.32, "#1a1a1a");
    grad.addColorStop(0.48, "#f9f9f9");
    grad.addColorStop(0.55, "#f16001");
    grad.addColorStop(0.68, "#c10801");
    grad.addColorStop(1, "#050505");
    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(envCanvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = makeEnvTexture();
  const envRT = pmrem.fromEquirectangular(envTexture);
  scene.environment = envRT.texture;
  envTexture.dispose();
  pmrem.dispose();

  const geometry = new THREE.TorusKnotGeometry(1.35, 0.42, 140, 20, 2, 3);
  const basePositions = geometry.attributes.position.array.slice();
  const posAttr = geometry.attributes.position;

  const material = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    metalness: 1,
    roughness: 0.18,
    envMapIntensity: 1.6,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(0.7, 0, 0.35);
  scene.add(mesh);

  // camada wireframe por cima — reforça o clima "tecnológico"
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0xf16001,
    wireframe: true,
    transparent: true,
    opacity: 0.22,
  });
  const wireMesh = new THREE.Mesh(geometry, wireMaterial);
  wireMesh.scale.setScalar(1.015);
  mesh.add(wireMesh);

  let waveT = 0;

  function updateWave() {
    for (let i = 0; i < posAttr.count; i++) {
      const ix = i * 3;
      const bx = basePositions[ix];
      const by = basePositions[ix + 1];
      const bz = basePositions[ix + 2];

      const wave = Math.sin(bx * 1.8 + waveT * 1.3) + Math.sin(by * 2.1 + waveT * 1.6) + Math.sin(bz * 1.5 + waveT * 1.1);
      const scale = 1 + (wave / 3) * 0.08;

      posAttr.array[ix] = bx * scale;
      posAttr.array[ix + 1] = by * scale;
      posAttr.array[ix + 2] = bz * scale;
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  scene.add(new THREE.AmbientLight(0x1a1a1a, 0.6));

  const keyLight = new THREE.PointLight(0xf9f9f9, 60, 25);
  keyLight.position.set(-3, 3, 5);
  scene.add(keyLight);

  const orangeLight = new THREE.PointLight(0xf16001, 80, 25);
  orangeLight.position.set(3, -1.5, 4);
  scene.add(orangeLight);

  const rimLight = new THREE.PointLight(0xc10801, 50, 25);
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

  // só revela o canvas depois do primeiro frame renderizado com sucesso —
  // se o WebGL falhar (bloqueado por extensão, sem suporte etc.), o canvas
  // fica invisível pra sempre e o fundo de reserva em CSS aparece no lugar.
  let revealed = false;

  function animate() {
    pointer.x += (pointer.targetX - pointer.x) * 0.05;
    pointer.y += (pointer.targetY - pointer.y) * 0.05;

    mesh.rotation.y += 0.004;
    mesh.rotation.x = 0.7 + pointer.y * 0.25;
    mesh.rotation.z = 0.35 + pointer.x * 0.2;

    waveT += 0.018;
    updateWave();

    try {
      renderer.render(scene, camera);
    } catch (err) {
      console.warn("[hero-3d] Falha ao renderizar, usando fundo CSS de reserva:", err);
      return;
    }

    if (!revealed) {
      revealed = true;
      canvas.classList.add("is-ready");
    }

    requestAnimationFrame(animate);
  }

  try {
    resize();
    animate();
  } catch (err) {
    console.warn("[hero-3d] Falha ao iniciar, usando fundo CSS de reserva:", err);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
})();
