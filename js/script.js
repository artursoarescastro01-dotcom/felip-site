// Header muda de estilo ao rolar + barra de progresso de leitura
(() => {
  const header = document.querySelector(".site-header");
  const progressBar = document.getElementById("progressBar");

  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 20);

    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progressBar.style.width = progress + "%";
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();

// Menu mobile
const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");

navToggle.addEventListener("click", () => {
  nav.classList.toggle("is-open");
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => nav.classList.remove("is-open"));
});

// Reveal on scroll
const revealEls = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

revealEls.forEach((el) => observer.observe(el));

// Ano no rodapé
document.getElementById("year").textContent = new Date().getFullYear();

// Brilho que acompanha o cursor (só em dispositivos com mouse de verdade)
const cursorGlow = document.getElementById("cursorGlow");
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (cursorGlow && hasFinePointer) {
  let raf = null;

  window.addEventListener("mousemove", (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      cursorGlow.style.setProperty("--mx", e.clientX + "px");
      cursorGlow.style.setProperty("--my", e.clientY + "px");
      cursorGlow.classList.add("is-active");
      raf = null;
    });
  });

  document.addEventListener("mouseleave", () => cursorGlow.classList.remove("is-active"));
}
