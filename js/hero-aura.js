// Fundo do hero — várias fitas de luz finas se cruzando (estilo "aura"),
// cada uma com movimento independente, mais poeira de partículas
// cintilantes. Na paleta da marca. Canvas 2D puro, sem libs — nasce
// exatamente na cor da marca e não tem moldura nem ponto de corte de loop.
(() => {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const hero = canvas.closest(".hero");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const RIBBON_STOPS = [
    [232, 80, 2], // laranja
    [193, 8, 1], // vermelho
    [241, 96, 1], // laranja 2
  ];

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function ribbonColor(progress) {
    const p = progress * (RIBBON_STOPS.length - 1);
    const i = Math.min(Math.floor(p), RIBBON_STOPS.length - 2);
    const localT = p - i;
    const a = RIBBON_STOPS[i];
    const b = RIBBON_STOPS[i + 1];
    return [
      Math.round(lerp(a[0], b[0], localT)),
      Math.round(lerp(a[1], b[1], localT)),
      Math.round(lerp(a[2], b[2], localT)),
    ];
  }

  let width, height, dpr;
  let particles = [];
  let t = 0;

  function makeParticles() {
    const count = Math.min(130, Math.round((width * height) / 9000));
    particles = Array.from({ length: count }, () => {
      const spark = Math.random() < 0.15;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: spark ? Math.random() * 1.4 + 1 : Math.random() * 4 + 1.5,
        driftY: Math.random() * 0.45 + 0.15,
        swayAmp: Math.random() * 16 + 5,
        swayFreq: Math.random() * 0.9 + 0.35,
        phase: Math.random() * Math.PI * 2,
        baseAlpha: spark ? Math.random() * 0.3 + 0.6 : Math.random() * 0.35 + 0.15,
        twinkleSpeed: Math.random() * 1.8 + 0.7,
        front: Math.random() < 0.3,
        color: spark ? "249, 249, 249" : ribbonColor(Math.random()).join(", "),
      };
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeParticles();
  }

  function drawGlowDot(x, y, radius, color, alpha) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${color}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles(front) {
    for (const p of particles) {
      if (p.front !== front) continue;

      p.y -= p.driftY;
      if (p.y < -20) {
        p.y = height + 20;
        p.x = Math.random() * width;
      }
      const x = p.x + Math.sin(t * p.swayFreq + p.phase) * p.swayAmp;
      const twinkle = 0.55 + 0.45 * Math.sin(t * p.twinkleSpeed + p.phase);

      drawGlowDot(x, p.y, p.r * (front ? 1.4 : 1), p.color, p.baseAlpha * twinkle);
    }
  }

  const STRANDS = [
    { fromX: 0.12, toX: 0.88, driftAmp: 0.05, driftSpeed: 0.16, wAmp1: 0.05, wFreq1: 4.4, wAmp2: 0.018, wFreq2: 9, phase: 0, speed: 1, cometSpeed: 0.16, colorOffset: 0 },
    { fromX: 0.88, toX: 0.14, driftAmp: 0.045, driftSpeed: 0.13, wAmp1: 0.045, wFreq1: 3.7, wAmp2: 0.02, wFreq2: 8.2, phase: 2.1, speed: 0.9, cometSpeed: 0.13, colorOffset: 0.3 },
    { fromX: 0.32, toX: 0.7, driftAmp: 0.04, driftSpeed: 0.21, wAmp1: 0.055, wFreq1: 5.3, wAmp2: 0.02, wFreq2: 10.5, phase: 4.2, speed: 1.15, cometSpeed: 0.2, colorOffset: 0.6 },
    { fromX: 0.68, toX: 0.3, driftAmp: 0.045, driftSpeed: 0.18, wAmp1: 0.05, wFreq1: 4, wAmp2: 0.022, wFreq2: 9.5, phase: 1.3, speed: 0.95, cometSpeed: 0.11, colorOffset: 0.15 },
    { fromX: 0.5, toX: 0.5, driftAmp: 0.09, driftSpeed: 0.1, wAmp1: 0.09, wFreq1: 3, wAmp2: 0.03, wFreq2: 7, phase: 3.4, speed: 1.05, cometSpeed: 0.24, colorOffset: 0.45 },
  ];

  function fadeEdges(progress) {
    return Math.max(0, Math.min(1, progress * 8, (1 - progress) * 8));
  }

  function strandPoint(s, progress) {
    const drift = Math.sin(t * s.driftSpeed + s.phase) * width * s.driftAmp;
    const wave =
      Math.sin(progress * s.wFreq1 + t * s.speed + s.phase) * width * s.wAmp1 +
      Math.sin(progress * s.wFreq2 + t * s.speed * 1.6 + s.phase) * width * s.wAmp2;

    const x = width * lerp(s.fromX, s.toX, progress) + wave + drift;
    const y = height * 0.05 + progress * height * 0.9;
    const thickness = width * 0.009 * fadeEdges(progress) * (0.8 + 0.2 * Math.sin(t * 2 + progress * 10 + s.phase));
    return { x, y, thickness };
  }

  function strandPath(s) {
    const segments = 90;
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      pts.push(strandPoint(s, i / segments));
    }
    return pts;
  }

  function tracePath(pts) {
    ctx.beginPath();
    pts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
  }

  function drawStrand(s) {
    const pts = strandPath(s);
    const first = pts[0];
    const last = pts[pts.length - 1];

    // gradiente com fade de opacidade nas pontas, pra fita "nascer" e
    // "sumir" suavemente em vez de terminar com uma ponta reta.
    const gradient = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
    gradient.addColorStop(0, `rgba(${RIBBON_STOPS[0].join(", ")}, 0)`);
    gradient.addColorStop(0.08, `rgba(${RIBBON_STOPS[0].join(", ")}, 1)`);
    gradient.addColorStop(0.5, `rgba(${RIBBON_STOPS[1].join(", ")}, 1)`);
    gradient.addColorStop(0.92, `rgba(${RIBBON_STOPS[2].join(", ")}, 1)`);
    gradient.addColorStop(1, `rgba(${RIBBON_STOPS[2].join(", ")}, 0)`);

    const baseWidth = width * 0.01;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // camada externa — brilho difuso
    tracePath(pts);
    ctx.strokeStyle = gradient;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = baseWidth * 2.4;
    ctx.shadowColor = `rgb(${ribbonColor(0.5).join(", ")})`;
    ctx.shadowBlur = baseWidth * 3;
    ctx.stroke();

    // camada média — corpo da fita
    tracePath(pts);
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = baseWidth;
    ctx.shadowBlur = baseWidth * 1.4;
    ctx.stroke();

    // núcleo branco quente
    tracePath(pts);
    ctx.strokeStyle = "rgba(249, 249, 249, 0.9)";
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = baseWidth * 0.32;
    ctx.shadowBlur = baseWidth * 0.8;
    ctx.shadowColor = "rgba(249, 249, 249, 0.9)";
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // brilho viajante — um ponto de luz que percorre a fita, tipo cometa
    const cometProgress = (t * s.cometSpeed + s.phase * 0.1) % 1;
    const comet = strandPoint(s, cometProgress);
    drawGlowDot(comet.x, comet.y, comet.thickness * 4, "249, 249, 249", 0.3);
    drawGlowDot(comet.x, comet.y, comet.thickness * 1.4, "249, 249, 249", 0.9);
  }

  function frame() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    drawParticles(false);
    STRANDS.forEach(drawStrand);
    drawParticles(true);

    ctx.globalCompositeOperation = "source-over";

    t += 0.022;
    window.__heroFrame = (window.__heroFrame || 0) + 1; // diagnóstico temporário

    if (!prefersReducedMotion) requestAnimationFrame(frame);
  }

  resize();
  frame();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
})();
