// Cases (Trabalhos) — renderizados a partir de data/projects.json, pra que
// projetos e categorias novas possam ser adicionados pelo painel /admin sem
// mexer no HTML
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function wireCarousel(carousel) {
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
}

async function renderTrabalhos() {
  const mount = document.getElementById("trabalhos-categories");
  if (!mount) return;

  try {
    const res = await fetch("data/projects.json", { cache: "no-store" });
    const data = await res.json();
    const categories = (data.categories || []).filter((cat) => cat.items && cat.items.length);

    mount.innerHTML = categories
      .map((cat) => {
        const gridClass = cat.items.length > 2 ? "trabalhos-grid trabalhos-grid--tres" : "trabalhos-grid";
        const cards = cat.items
          .map(
            (item) => `
          <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener" class="trabalho-card">
            <img class="trabalho-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(cat.label)} ${escapeHtml(item.name)}" loading="lazy" />
            <span class="trabalho-label">${escapeHtml(item.name)}</span>
            <span class="trabalho-arrow">↗</span>
          </a>`
          )
          .join("");

        return `
        <h3 class="trabalhos-subhead">${escapeHtml(cat.label)}</h3>
        <div class="trabalhos-carousel">
          <button type="button" class="carousel-arrow carousel-arrow--prev" data-carousel-prev aria-label="Case anterior">‹</button>
          <div class="${gridClass}" data-carousel-track data-category="${escapeHtml(cat.key)}">${cards}</div>
          <button type="button" class="carousel-arrow carousel-arrow--next" data-carousel-next aria-label="Próximo case">›</button>
        </div>`;
      })
      .join("");

    mount.querySelectorAll(".trabalhos-carousel").forEach(wireCarousel);
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
