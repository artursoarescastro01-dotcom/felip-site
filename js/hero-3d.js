// Fundo 3D do hero — logo da Salton Design em metal cromado girando
// (WebGL via Three.js), com wireframe brilhante por cima e ambiente
// procedural (gera reflexo de luz na paleta da marca) pra dar aspecto de
// metal líquido de verdade. A logo é vetorizada a partir do PNG oficial
// da marca e extrudada em 3D. Se WebGL não estiver disponível (ou falhar
// por qualquer motivo: driver de vídeo, bloqueio de extensão etc.), falha
// em silêncio e o gradiente CSS do hero (ver style.css) fica visível no
// lugar.
import * as THREE from "../assets/vendor/three.module.js";
import { SVGLoader } from "../assets/vendor/SVGLoader.js";

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
  camera.position.set(0, 0, 4.6);

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

  // Símbolo "S" da Salton Design, vetorizado a partir do PNG oficial da marca.
  const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1081" height="1081" viewBox="0 0 1081 1081" version="1.1">
	<path d="M 369.500 116.070 C 239.209 122.712, 125.648 212.295, 89.106 337.259 C 60.614 434.698, 80.920 538.589, 143.979 618 C 154.669 631.462, 179.504 656.250, 193 666.929 C 244.240 707.472, 307.490 731.298, 370.250 733.697 L 386 734.299 386 656.799 L 386 579.300 375.250 578.726 C 308.291 575.155, 249.457 524.484, 234.918 457.865 C 223.707 406.501, 239.407 353.494, 276.951 315.951 C 298.219 294.683, 321.170 281.912, 352 274.192 L 362.500 271.562 614.500 270.967 C 889.717 270.317, 869.792 270.755, 890.828 264.894 C 954.092 247.267, 1000.476 190.305, 1003.726 126.250 L 1004.297 115 694.399 115.153 C 523.954 115.237, 377.750 115.650, 369.500 116.070 M 453.128 348.051 C 421.595 352.281, 395.998 375.226, 388.023 406.410 C 386.143 413.759, 386 417.428, 386 458.160 L 386 502 539.250 502.029 C 691.543 502.058, 710.273 502.409, 725.534 505.515 C 785.473 517.714, 833.290 565.044, 846.051 624.801 C 848.729 637.342, 849.738 663.099, 848.071 676.346 C 839.868 741.511, 792.204 792.937, 725.782 808.288 L 716.500 810.433 464.500 811.040 C 235.297 811.591, 211.783 811.796, 204.575 813.302 C 130.983 828.678, 82.286 883.607, 76.504 957.765 L 75.860 966.030 400.680 965.747 L 725.500 965.464 739.500 963.183 C 823.793 949.448, 893.366 907.855, 943 841.523 C 994.096 773.238, 1014.507 686.488, 999.356 602 C 976.981 477.229, 880.517 378.786, 755.911 353.563 C 726.273 347.564, 730.050 347.702, 589 347.438 C 517.775 347.305, 456.632 347.581, 453.128 348.051 M 416.667 579.667 C 416.300 580.033, 416 614.908, 416 657.167 L 416 734 494.096 734 L 572.191 734 571.752 689.750 C 571.336 647.767, 571.199 645.091, 569.083 637.523 C 560.346 606.266, 535.502 584.445, 503.678 580.074 C 495.214 578.912, 417.784 578.549, 416.667 579.667 M 599 594.939 L 599 611.023 637.750 610.762 L 676.500 610.500 676.191 606.500 C 675.438 596.762, 668.026 586.781, 658.086 582.120 C 652.562 579.529, 652.202 579.496, 625.750 579.177 L 599 578.855 599 594.939 M 599 656.966 L 599 673 676.636 673 L 754.272 673 753.625 668.250 C 752.209 657.844, 744.943 648.178, 735.122 643.637 C 730.571 641.533, 729.497 641.496, 664.750 641.216 L 599 640.932 599 656.966 M 599 718.441 L 599 734 638 734 C 670.691 734, 677 733.774, 677 732.605 C 677 731.838, 676.102 728.304, 675.005 724.752 C 672.477 716.567, 666.941 710.100, 659.214 706.306 L 653.500 703.500 626.250 703.191 L 599 702.882 599 718.441" stroke="none" fill="#000000" fill-rule="evenodd"/>
</svg>`;

  const material = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    metalness: 1,
    roughness: 0.18,
    envMapIntensity: 1.6,
  });

  // camada wireframe por cima — reforça o clima "tecnológico"
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0xf16001,
    wireframe: true,
    transparent: true,
    opacity: 0.22,
  });

  // halo aditivo por trás — simula um leve "glow" nas bordas sem post-processing
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xf16001,
    transparent: true,
    opacity: 0.16,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const logoGroup = new THREE.Group();
  const shapeGroup = new THREE.Group();
  const wireGroup = new THREE.Group();
  const glowGroup = new THREE.Group();
  logoGroup.add(glowGroup, shapeGroup, wireGroup);
  scene.add(logoGroup);

  const extrudeSettings = {
    depth: 80,
    bevelEnabled: true,
    bevelThickness: 6,
    bevelSize: 4,
    bevelSegments: 3,
    curveSegments: 12,
  };

  const svgLoader = new SVGLoader();
  const svgData = svgLoader.parse(LOGO_SVG);

  svgData.paths.forEach((path) => {
    const shapes = SVGLoader.createShapes(path);
    shapes.forEach((shape) => {
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

      const solidMesh = new THREE.Mesh(geometry, material);
      shapeGroup.add(solidMesh);

      const wireMesh = new THREE.Mesh(geometry, wireMaterial);
      wireGroup.add(wireMesh);

      const glowMesh = new THREE.Mesh(geometry, glowMaterial);
      glowGroup.add(glowMesh);
    });
  });

  // centraliza o conjunto pela bbox real, preservando a posição relativa
  // entre as várias sub-formas que compõem o símbolo (contorno + ícone interno)
  const box = new THREE.Box3().setFromObject(shapeGroup);
  const center = box.getCenter(new THREE.Vector3());
  shapeGroup.position.sub(center);
  wireGroup.position.sub(center);
  wireGroup.scale.setScalar(1.015);
  glowGroup.position.sub(center);
  glowGroup.scale.setScalar(1.09);

  const size = box.getSize(new THREE.Vector3());
  const targetSize = 3.2;
  const scale = targetSize / Math.max(size.x, size.y);
  // eixo Y invertido: coordenadas de SVG crescem pra baixo, three.js pra cima
  logoGroup.scale.set(scale, -scale, scale);
  logoGroup.rotation.set(0.5, 0, 0.1);

  // partículas flutuantes — pequenas "bolinhas" ao redor do símbolo, dão
  // sensação de campo de dados/atmosfera tecnológica
  const PARTICLE_COUNT = 90;
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const radius = 2.6 + Math.random() * 1.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    particlePositions[i * 3 + 2] = radius * Math.cos(phi) * 0.5;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xf9f9f9,
    size: 0.028,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

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
    // em telas muito grandes (4K e afins) renderizar em resolução total fica
    // pesado pra GPU e derruba o frame-rate da página inteira (inclusive o
    // rodapé giratório, que também depende de frames fluidos) — reduz o
    // pixel-ratio conforme a área do canvas cresce pra manter tudo leve
    const area = width * height;
    const maxRatio = area > 3000000 ? 1 : area > 1600000 ? 1.25 : 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
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
  let clock = 0;

  function animate() {
    pointer.x += (pointer.targetX - pointer.x) * 0.05;
    pointer.y += (pointer.targetY - pointer.y) * 0.05;

    logoGroup.rotation.y += 0.005;
    logoGroup.rotation.x = 0.5 + pointer.y * 0.22;
    logoGroup.rotation.z = 0.1 + pointer.x * 0.18;

    clock += 0.016;

    // partículas derivam bem devagar, dando sensação de campo de dados
    particles.rotation.y += 0.0008;
    particles.rotation.x += 0.0004;

    // leve "respiração" no wireframe e no halo — reforça o clima tecnológico
    const pulse = Math.sin(clock * 1.4) * 0.5 + 0.5;
    wireMaterial.opacity = 0.14 + pulse * 0.2;
    glowMaterial.opacity = 0.08 + pulse * 0.14;

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

