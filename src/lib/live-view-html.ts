export function createLiveViewHtml(username: string, appOrigin: string) {
  const safeUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const endpoint = `${appOrigin}/api/public/live-view/${encodeURIComponent(safeUsername)}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#000000">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="format-detection" content="telephone=no">
  <title>Tela Preta - ${safeUsername}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body {
      width: 100%; height: 100%; overflow: hidden; background: #000 !important;
      position: fixed; inset: 0;
      -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
      overscroll-behavior: none; touch-action: none;
    }
    #live-screen-container { position: fixed; inset: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 1; background: #000; }
    #live-screen-content { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    #loading-overlay, #error-overlay { position: fixed; inset: 0; background: #000; flex-direction: column; align-items: center; justify-content: center; z-index: 9998; }
    #loading-overlay { display: flex; transition: opacity 0.25s ease; }
    #loading-overlay.hidden { opacity: 0; pointer-events: none; }
    #error-overlay { display: none; z-index: 9997; }
    #error-overlay.visible { display: flex; }
    .spinner { width: 36px; height: 36px; border: 3px solid rgba(0,229,255,0.15); border-top-color: #00e5ff; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { color: #00e5ff; font-family: -apple-system, monospace; font-size: 13px; margin-top: 14px; opacity: 0.7; }
    .error-icon { width: 56px; height: 56px; border-radius: 50%; border: 2px solid rgba(255,45,85,0.5); display: flex; align-items: center; justify-content: center; color: #ff2d55; font-size: 26px; margin-bottom: 16px; }
    .error-text { color: rgba(255,255,255,0.7); font-family: -apple-system, sans-serif; font-size: 14px; text-align: center; max-width: 320px; line-height: 1.6; padding: 0 20px; white-space: pre-line; }
    .error-hint { color: rgba(0,229,255,0.6); font: 12px -apple-system, sans-serif; margin-top: 12px; }

    /* Convite para entrar em tela cheia (necessário um toque do usuário). */
    #fs-gate { position: fixed; inset: 0; z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; background: #000; color: #fff; font-family: -apple-system, sans-serif; transition: opacity 0.3s ease; }
    #fs-gate.hidden { opacity: 0; pointer-events: none; }
    #fs-gate .fs-icon { width: 78px; height: 78px; border-radius: 22px; border: 2px solid rgba(0,229,255,0.45); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 40px rgba(0,229,255,0.25); animation: pulse 2s ease-in-out infinite; }
    #fs-gate .fs-icon svg { width: 38px; height: 38px; stroke: #00e5ff; }
    #fs-gate .fs-title { font-size: 17px; font-weight: 600; letter-spacing: 0.2px; }
    #fs-gate .fs-sub { font-size: 13px; color: rgba(255,255,255,0.55); }
    @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: 0.85; } }
  </style>
</head>
<body>
  <div id="live-screen-container"><div id="live-screen-content"></div></div>
  <div id="loading-overlay"><div class="spinner"></div><div class="loading-text">Conectando...</div></div>
  <div id="error-overlay"><div class="error-icon">✕</div><div class="error-text" id="error-text">Nenhuma tela ativa.</div><div class="error-hint">Aguarde o admin ativar uma tela para você.</div></div>

  <div id="fs-gate">
    <div class="fs-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
    </div>
    <div class="fs-title">Toque para abrir em tela cheia</div>
    <div class="fs-sub">Mantém a tela ligada e sem barras do navegador</div>
  </div>

  <script>
    const LIVE_ENDPOINT = ${JSON.stringify(endpoint)};
    let currentActiveId = null;
    let pollInterval = null;
    const POLL_MS = 1500;
    let wakeLock = null;

    /* ---------- Tela cheia + manter tela ligada ---------- */
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
          wakeLock.addEventListener("release", () => { wakeLock = null; });
        }
      } catch (e) { /* ignora: alguns navegadores negam sem HTTPS */ }
    }

    async function goFullscreen() {
      const el = document.documentElement;
      try {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.webkitEnterFullscreen) el.webkitEnterFullscreen();
      } catch (e) { /* iOS Safari em <body> pode negar; seguimos assim mesmo */ }
      try {
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("portrait");
      } catch (e) { /* nem todo aparelho permite travar orientação */ }
      await requestWakeLock();
    }

    const gate = document.getElementById("fs-gate");
    async function enterAndStart() {
      gate.classList.add("hidden");
      setTimeout(() => { gate.style.display = "none"; }, 320);
      await goFullscreen();
    }
    gate.addEventListener("click", enterAndStart, { once: true });
    gate.addEventListener("touchend", (e) => { e.preventDefault(); enterAndStart(); }, { once: true });

    // Reobter o wake lock ao voltar para a aba.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && wakeLock === null) requestWakeLock();
    });

    // Bloqueia zoom por gesto/duplo toque e menu de contexto.
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    let lastTouch = 0;
    document.addEventListener("touchend", (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });

    /* ---------- Busca e renderiza a tela ativa ---------- */
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
