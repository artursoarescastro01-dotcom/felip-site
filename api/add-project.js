// Função serverless (Vercel) usada pelo painel /admin.html — recebe os dados
// de um projeto novo e commita direto no repositório do GitHub (imagem +
// data/projects.json atualizado). Como a Vercel está conectada ao GitHub,
// esse commit sozinho já dispara um novo deploy automático do site.
//
// Variáveis de ambiente necessárias (configuradas no projeto na Vercel):
//   ADMIN_PASSWORD — senha que protege o painel
//   GITHUB_TOKEN   — personal access token com permissão de escrita (Contents)
//                    no repositório abaixo
//   GITHUB_REPO    — "usuario/repositorio", ex: "artursoarescastro01-dotcom/felip-site"

const GITHUB_API = "https://api.github.com";

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(text) {
  return text
    .toString()
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function githubRequest(path, token, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || `GitHub API error (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const { ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO } = process.env;

  if (!ADMIN_PASSWORD || !GITHUB_TOKEN || !GITHUB_REPO) {
    res.status(500).json({ error: "Painel ainda não configurado no servidor. Fala com o Artur." });
    return;
  }

  const { password, category, name, link, imageBase64, imageExt } = req.body || {};

  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Senha incorreta." });
    return;
  }

  if (!["identidade", "social"].includes(category)) {
    res.status(400).json({ error: "Categoria inválida." });
    return;
  }

  if (!name || !name.trim() || !link || !link.trim() || !imageBase64) {
    res.status(400).json({ error: "Preencha nome, link e a capa do projeto." });
    return;
  }

  const safeExt = ["jpg", "jpeg", "png", "webp"].includes((imageExt || "").toLowerCase())
    ? imageExt.toLowerCase()
    : "jpg";

  const slug = slugify(name) || `projeto-${Date.now()}`;
  const imagePath = `assets/img/cases/${slug}.${safeExt}`;
  const dataPath = "data/projects.json";

  try {
    // 1. sobe a imagem de capa
    await githubRequest(`/repos/${GITHUB_REPO}/contents/${imagePath}`, GITHUB_TOKEN, {
      method: "PUT",
      body: JSON.stringify({
        message: `Adiciona capa do case "${name}"`,
        content: imageBase64,
        branch: "main",
      }),
    });

    // 2. lê o projects.json atual (pra pegar o sha e o conteúdo)
    const current = await githubRequest(`/repos/${GITHUB_REPO}/contents/${dataPath}?ref=main`, GITHUB_TOKEN);
    const currentJson = JSON.parse(Buffer.from(current.content, "base64").toString("utf-8"));

    if (!currentJson[category]) currentJson[category] = [];
    currentJson[category].push({
      id: slug,
      name: name.trim(),
      link: link.trim(),
      image: imagePath,
    });

    const updatedContent = Buffer.from(JSON.stringify(currentJson, null, 2) + "\n", "utf-8").toString("base64");

    // 3. atualiza o projects.json com o novo projeto
    await githubRequest(`/repos/${GITHUB_REPO}/contents/${dataPath}`, GITHUB_TOKEN, {
      method: "PUT",
      body: JSON.stringify({
        message: `Adiciona case "${name}" via painel`,
        content: updatedContent,
        sha: current.sha,
        branch: "main",
      }),
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[add-project]", err);
    res.status(err.status || 500).json({ error: err.message || "Erro ao publicar o projeto." });
  }
};
