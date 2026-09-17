export function createLiveViewHtml(username: string, appOrigin: string) {
  const safeUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const endpoint = `${appOrigin}/api/public/live-view/${encodeURIComponent(safeUsername)}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#0a0a1a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="mobile-web-app-capable" content="yes">
  <title>Tela Preta - ${safeUsername}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent !important; position: fixed; inset: 0; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
    #live-screen-container { position: fixed; inset: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 1; }
    #live-screen-content { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    #loading-overlay, #error-overlay { position: fixed; inset: 0; background: #0a0a0f; flex-direction: column; align-items: center; justify-content: center; z-index: 9998; }
    #loading-overlay { display: flex; transition: opacity 0.15s ease; }
    #loading-overlay.hidden { opacity: 0; pointer-events: none; }
    #error-overlay { display: none; z-index: 9997; }
    #error-overlay.visible { display: flex; }
    .spinner { width: 36px; height: 36px; border: 3px solid rgba(0,229,255,0.15); border-top-color: #00e5ff; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { color: #00e5ff; font-family: -apple-system, monospace; font-size: 13px; margin-top: 14px; opacity: 0.7; }
    .error-icon { width: 56px; height: 56px; border-radius: 50%; border: 2px solid rgba(255,45,85,0.5); display: flex; align-items: center; justify-content: center; color: #ff2d55; font-size: 26px; margin-bottom: 16px; }
    .error-text { color: rgba(255,255,255,0.7); font-family: -apple-system, sans-serif; font-size: 14px; text-align: center; max-width: 320px; line-height: 1.6; padding: 0 20px; white-space: pre-line; }
    .error-hint { color: rgba(0,229,255,0.6); font: 12px -apple-system, sans-serif; margin-top: 12px; }
  </style>
</head>
<body>
  <div id="live-screen-container"><div id="live-screen-content"></div></div>
  <div id="loading-overlay"><div class="spinner"></div><div class="loading-text">Conectando...</div></div>
  <div id="error-overlay"><div class="error-icon">✕</div><div class="error-text" id="error-text">Nenhuma tela ativa.</div><div class="error-hint">Aguarde o admin ativar uma tela para você.</div></div>
  <script>
    const LIVE_ENDPOINT = ${JSON.stringify(endpoint)};
    let currentActiveId = null;
    let pollInterval = null;
    const POLL_MS = 1500;

    async function fetchLiveData() {
      try {
        const response = await fetch(LIVE_ENDPOINT, { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        return await response.json();
      } catch (error) {
        console.error("Falha ao buscar a tela:", error);
        return null;
      }
    }

    async function loadAndRender() {
      const result = await fetchLiveData();
      if (!result) return;
      const loading = document.getElementById("loading-overlay");
      const error = document.getElementById("error-overlay");
      const errorText = document.getElementById("error-text");
      const content = document.getElementById("live-screen-content");

      if (!result.activeTemplateId) {
        content.innerHTML = "";
        currentActiveId = null;
        loading.classList.add("hidden");
        error.classList.add("visible");
        errorText.textContent = "Nenhuma tela ativa.";
        return;
      }

      if (!result.html) {
        loading.classList.add("hidden");
        error.classList.add("visible");
        errorText.textContent = "Template não encontrado.";
        return;
      }

      if (currentActiveId !== result.activeTemplateId) {
        content.innerHTML = result.html;
        content.querySelectorAll("script").forEach((oldScript) => {
          const newScript = document.createElement("script");
          newScript.textContent = oldScript.textContent;
          if (oldScript.src) newScript.src = oldScript.src;
          if (oldScript.type) newScript.type = oldScript.type;
          oldScript.parentNode.replaceChild(newScript, oldScript);
        });
        currentActiveId = result.activeTemplateId;
        loading.classList.add("hidden");
        error.classList.remove("visible");
      }
    }

    loadAndRender();
    pollInterval = setInterval(loadAndRender, POLL_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearInterval(pollInterval);
      else { loadAndRender(); pollInterval = setInterval(loadAndRender, POLL_MS); }
    });
  </script>
</body>
</html>`;
}