// Função serverless (Vercel) usada pelo painel /admin.html — adiciona ou
// remove um serviço da seção "Serviços" commitando direto no GitHub
// (data/servicos.json). Mesma lógica de deploy automático das outras
// funções do painel.

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

async function readServicos(token, repo) {
  const current = await githubRequest(`/repos/${repo}/contents/data/servicos.json?ref=main`, token);
  const json = JSON.parse(Buffer.from(current.content, "base64").toString("utf-8"));
  if (!json.items) json.items = [];
  return { json, sha: current.sha };
}

async function writeServicos(token, repo, json, sha, message) {
  const updatedContent = Buffer.from(JSON.stringify(json, null, 2) + "\n", "utf-8").toString("base64");
  await githubRequest(`/repos/${repo}/contents/data/servicos.json`, token, {
    method: "PUT",
    body: JSON.stringify({ message, content: updatedContent, sha, branch: "main" }),
  });
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
  const { password, action } = body;

  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Senha incorreta." });
    return;
  }

  try {
    if (action === "add") {
      const { title, description } = body;

      if (!title || !title.trim() || !description || !description.trim()) {
        res.status(400).json({ error: "Preencha título e descrição do serviço." });
        return;
      }

      const { json, sha } = await readServicos(GITHUB_TOKEN, GITHUB_REPO);
      const id = slugify(title) || `servico-${Date.now()}`;
      json.items.push({ id, title: title.trim(), description: description.trim() });

      await writeServicos(GITHUB_TOKEN, GITHUB_REPO, json, sha, `Adiciona serviço "${title}" via painel`);
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "delete") {
      const { id } = body;

      if (!id) {
        res.status(400).json({ error: "Serviço não identificado." });
        return;
      }

      const { json, sha } = await readServicos(GITHUB_TOKEN, GITHUB_REPO);
      const index = json.items.findIndex((s) => s.id === id);
      if (index === -1) {
        res.status(404).json({ error: "Serviço não encontrado." });
        return;
      }

      const [removed] = json.items.splice(index, 1);

      await writeServicos(GITHUB_TOKEN, GITHUB_REPO, json, sha, `Remove serviço "${removed.title}" via painel`);
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "move") {
      const { id, direction } = body;

      if (!id || !["up", "down"].includes(direction)) {
        res.status(400).json({ error: "Pedido de reordenação inválido." });
        return;
      }

      const { json, sha } = await readServicos(GITHUB_TOKEN, GITHUB_REPO);
      const index = json.items.findIndex((s) => s.id === id);
      if (index === -1) {
        res.status(404).json({ error: "Serviço não encontrado." });
        return;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= json.items.length) {
        res.status(200).json({ ok: true });
        return;
      }

      [json.items[index], json.items[targetIndex]] = [json.items[targetIndex], json.items[index]];

      await writeServicos(GITHUB_TOKEN, GITHUB_REPO, json, sha, "Reordena serviços via painel");
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: "Ação inválida." });
  } catch (err) {
    console.error("[manage-servicos]", err);
    res.status(err.status || 500).json({ error: err.message || "Erro ao processar o pedido." });
  }
};
