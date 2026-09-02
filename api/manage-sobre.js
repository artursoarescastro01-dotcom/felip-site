// Função serverless (Vercel) usada pelo painel /admin.html — atualiza a foto
// e o texto da seção "Sobre mim" commitando direto no GitHub (data/sobre.json
// + a foto, se uma nova for enviada). Mesma lógica de deploy automático das
// outras funções do painel.

const GITHUB_API = "https://api.github.com";

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

  const { password, paragraphs, quote, imageBase64, imageExt } = req.body || {};

  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Senha incorreta." });
    return;
  }

  const cleanParagraphs = Array.isArray(paragraphs)
    ? paragraphs.map((p) => p.trim()).filter(Boolean)
    : [];

  if (!cleanParagraphs.length) {
    res.status(400).json({ error: "Escreve pelo menos um parágrafo." });
    return;
  }

  const safeExt = ["jpg", "jpeg", "png", "webp"].includes((imageExt || "").toLowerCase())
    ? imageExt.toLowerCase()
    : "jpg";

  try {
    const current = await githubRequest(`/repos/${GITHUB_REPO}/contents/data/sobre.json?ref=main`, GITHUB_TOKEN);
    const json = JSON.parse(Buffer.from(current.content, "base64").toString("utf-8"));

    json.paragraphs = cleanParagraphs;
    if (quote && quote.trim()) json.quote = quote.trim();

    if (imageBase64) {
      const imagePath = `assets/img/felipe-foto.${safeExt}`;
      await githubRequest(`/repos/${GITHUB_REPO}/contents/${imagePath}`, GITHUB_TOKEN, {
        method: "PUT",
        body: JSON.stringify({
          message: "Atualiza foto da seção Sobre mim via painel",
          content: imageBase64,
          branch: "main",
        }),
      });
      json.photo = imagePath;
    }

    const updatedContent = Buffer.from(JSON.stringify(json, null, 2) + "\n", "utf-8").toString("base64");
    await githubRequest(`/repos/${GITHUB_REPO}/contents/data/sobre.json`, GITHUB_TOKEN, {
      method: "PUT",
      body: JSON.stringify({
        message: "Atualiza texto da seção Sobre mim via painel",
        content: updatedContent,
        sha: current.sha,
        branch: "main",
      }),
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[manage-sobre]", err);
    res.status(err.status || 500).json({ error: err.message || "Erro ao processar o pedido." });
  }
};
