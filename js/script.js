// Cases (Trabalhos) — renderizados a partir de data/projects.json, pra que
// novos projetos possam ser adicionados pelo painel /admin sem mexer no HTML
async function renderTrabalhos() {
  const tracks = document.querySelectorAll("[data-carousel-track][data-category]");
  if (!tracks.length) return;

  try {
    const res = await fetch("data/projects.json", { cache: "no-store" });
    const data = await res.json();

    tracks.forEach((track) => {
      const category = track.dataset.category;
      const items = data[category] || [];
      const labelPrefix = category === "identidade" ? "Identidade visual" : "Social media";

      track.innerHTML = items
        .map(
          (item) => `
        <a href="${item.link}" target="_blank" rel="noopener" class="trabalho-card">
          <img class="trabalho-img" src="${item.image}" alt="${labelPrefix} ${item.name}" loading="lazy" />
          <span class="trabalho-label">${item.name}</span>
          <span class="trabalho-arrow">↗</span>
        </a>`
        )
        .join("");
    });
  } catch (err) {
    console.warn("[trabalhos] Não foi possível carregar os cases:", err);
  }
}

renderTrabalhos();

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

// Carrossel de cases (Social Media) — setas rolam um card por clique
document.querySelectorAll(".trabalhos-carousel").forEach((carousel) => {
  const track = carousel.querySelector("[data-carousel-track]");
  const prev = carousel.querySelector("[data-carousel-prev]");
  const next = carousel.querySelector("[data-carousel-next]");
  if (!track || !prev || !next) return;

  function scrollByCard(direction) {
    const card = track.querySelector(".trabalho-card");
    const amount = card ? card.getBoundingClientRect().width + 20 : track.clientWidth * 0.82;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  prev.addEventListener("click", () => scrollByCard(-1));
  next.addEventListener("click", () => scrollByCard(1));
});

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
