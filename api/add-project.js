// Função serverless (Vercel) usada pelo painel /admin.html — recebe os dados
// de um projeto (adicionar, editar ou excluir) e commita direto no
// repositório do GitHub (imagem + data/projects.json atualizado). Como a
// Vercel está conectada ao GitHub, esse commit sozinho já dispara um novo
// deploy automático do site.
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

async function readProjects(token, repo) {
  const current = await githubRequest(`/repos/${repo}/contents/data/projects.json?ref=main`, token);
  const json = JSON.parse(Buffer.from(current.content, "base64").toString("utf-8"));
  if (!json.categories) json.categories = [];
  return { json, sha: current.sha };
}

async function writeProjects(token, repo, json, sha, message) {
  const updatedContent = Buffer.from(JSON.stringify(json, null, 2) + "\n", "utf-8").toString("base64");
  await githubRequest(`/repos/${repo}/contents/data/projects.json`, token, {
    method: "PUT",
    body: JSON.stringify({ message, content: updatedContent, sha, branch: "main" }),
  });
}

async function uploadImage(token, repo, path, base64, message) {
  await githubRequest(`/repos/${repo}/contents/${path}`, token, {
    method: "PUT",
    body: JSON.stringify({ message, content: base64, branch: "main" }),
  });
}

async function deleteFile(token, repo, path, message) {
  try {
    const current = await githubRequest(`/repos/${repo}/contents/${path}?ref=main`, token);
    await githubRequest(`/repos/${repo}/contents/${path}`, token, {
      method: "DELETE",
      body: JSON.stringify({ message, sha: current.sha, branch: "main" }),
    });
  } catch (err) {
    // não é crítico se a imagem antiga não existir mais / já ter sido removida
    console.warn("[manage-project] não conseguiu apagar arquivo:", path, err.message);
  }
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

  const body = req.body || {};
  const { password, action = "add" } = body;

  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Senha incorreta." });
    return;
  }

  const safeExt = (ext) => (["jpg", "jpeg", "png", "webp"].includes((ext || "").toLowerCase()) ? ext.toLowerCase() : "jpg");

  try {
    if (action === "add") {
      const { category, categoryLabel, name, link, imageBase64, imageExt } = body;

      if (!category || !category.trim()) {
        res.status(400).json({ error: "Escolha ou crie uma categoria." });
        return;
      }
      if (!name || !name.trim() || !link || !link.trim() || !imageBase64) {
        res.status(400).json({ error: "Preencha nome, link e a capa do projeto." });
        return;
      }

      const categoryKey = slugify(category) || slugify(categoryLabel) || `categoria-${Date.now()}`;
      const slug = slugify(name) || `projeto-${Date.now()}`;
      const imagePath = `assets/img/cases/${categoryKey}-${slug}.${safeExt(imageExt)}`;

      await uploadImage(GITHUB_TOKEN, GITHUB_REPO, imagePath, imageBase64, `Adiciona capa do case "${name}"`);

      const { json, sha } = await readProjects(GITHUB_TOKEN, GITHUB_REPO);
      let cat = json.categories.find((c) => c.key === categoryKey);
      if (!cat) {
        cat = { key: categoryKey, label: (categoryLabel && categoryLabel.trim()) || name.trim(), items: [] };
        json.categories.push(cat);
      }
      cat.items.push({ id: slug, name: name.trim(), link: link.trim(), image: imagePath });

      await writeProjects(GITHUB_TOKEN, GITHUB_REPO, json, sha, `Adiciona case "${name}" via painel`);
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "edit") {
      const { category, id, name, link, imageBase64, imageExt } = body;

      if (!category || !id) {
        res.status(400).json({ error: "Projeto não identificado." });
        return;
      }

      const { json, sha } = await readProjects(GITHUB_TOKEN, GITHUB_REPO);
      const cat = json.categories.find((c) => c.key === category);
      const item = cat && cat.items.find((p) => p.id === id);
      if (!cat || !item) {
        res.status(404).json({ error: "Projeto não encontrado." });
        return;
      }

      if (name && name.trim()) item.name = name.trim();
      if (link && link.trim()) item.link = link.trim();

      if (imageBase64) {
        const newImagePath = `assets/img/cases/${category}-${item.id}.${safeExt(imageExt)}`;
        await uploadImage(GITHUB_TOKEN, GITHUB_REPO, newImagePath, imageBase64, `Atualiza capa do case "${item.name}"`);
        item.image = newImagePath;
      }

      await writeProjects(GITHUB_TOKEN, GITHUB_REPO, json, sha, `Edita case "${item.name}" via painel`);
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "delete") {
      const { category, id } = body;

      if (!category || !id) {
        res.status(400).json({ error: "Projeto não identificado." });
        return;
      }

      const { json, sha } = await readProjects(GITHUB_TOKEN, GITHUB_REPO);
      const cat = json.categories.find((c) => c.key === category);
      const itemIndex = cat ? cat.items.findIndex((p) => p.id === id) : -1;
      if (!cat || itemIndex === -1) {
        res.status(404).json({ error: "Projeto não encontrado." });
        return;
      }

      const [removed] = cat.items.splice(itemIndex, 1);

      await writeProjects(GITHUB_TOKEN, GITHUB_REPO, json, sha, `Remove case "${removed.name}" via painel`);
      if (removed.image) {
        await deleteFile(GITHUB_TOKEN, GITHUB_REPO, removed.image, `Remove imagem do case "${removed.name}"`);
      }

      res.status(200).json({ ok: true });
      return;
    }

    if (action === "move") {
      const { category, id, direction } = body;

      if (!category || !id || !["up", "down"].includes(direction)) {
        res.status(400).json({ error: "Pedido de reordenação inválido." });
        return;
      }

      const { json, sha } = await readProjects(GITHUB_TOKEN, GITHUB_REPO);
      const cat = json.categories.find((c) => c.key === category);
      const index = cat ? cat.items.findIndex((p) => p.id === id) : -1;
      if (!cat || index === -1) {
        res.status(404).json({ error: "Projeto não encontrado." });
        return;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= cat.items.length) {
        res.status(200).json({ ok: true });
        return;
      }

      [cat.items[index], cat.items[targetIndex]] = [cat.items[targetIndex], cat.items[index]];

      await writeProjects(GITHUB_TOKEN, GITHUB_REPO, json, sha, `Reordena cases de "${cat.label}" via painel`);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: "Ação inválida." });
  } catch (err) {
    console.error("[manage-project]", err);
    res.status(err.status || 500).json({ error: err.message || "Erro ao processar o pedido." });
  }
};
