(() => {
  const convex = window.CONVEX_CLIENT;

  function formatHours(ms) {
    if (!ms || ms <= 0) {
      return "0.00h";
    }
    const hours = ms / 3600000;
    return `${hours.toFixed(2)}h`;
  }

  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
  }

  async function requestFullscreen(element) {
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
    } catch {
      // Keep the game playable inline if the browser declines fullscreen.
      if (fullscreenIntent === element) {
        fullscreenIntent = null;
      }
    }
  }

  function exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  let fullscreenIntent = null;

  function isFullscreenAllowed(fullscreenElement) {
    if (!fullscreenElement || !fullscreenIntent) {
      return false;
    }
    if (fullscreenIntent === fullscreenElement) {
      return true;
    }
    return fullscreenIntent.contains(fullscreenElement);
  }

  function handleFullscreenChange() {
    const fullscreenElement = getFullscreenElement();
    if (!fullscreenElement) {
      fullscreenIntent = null;
      return;
    }
    if (!isFullscreenAllowed(fullscreenElement)) {
      fullscreenIntent = null;
      exitFullscreen();
    }
  }

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

  function isTouchDevice() {
    return window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  }

  function isPortraitOrientation() {
    return window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
  }

  function updateMobileOrientationClass(frameWrap) {
    if (!frameWrap) {
      return;
    }
    frameWrap.classList.toggle("mobile-portrait", isPortraitOrientation());
  }

  async function lockLandscapeOrientation() {
    if (screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock("landscape");
      } catch {
        // Some browsers require fullscreen or ignore the lock.
      }
    }
  }

  function unlockOrientation() {
    if (screen.orientation && screen.orientation.unlock) {
      try {
        screen.orientation.unlock();
      } catch {
        // Ignore unlock errors.
      }
    }
  }

  function applyFullscreenSizing(frameWrap, frame) {
    if (!frameWrap || !frame) {
      return;
    }
    const fullscreenElement = getFullscreenElement();
    const isMobileFullscreen = frameWrap.classList.contains("mobile-fullscreen");
    if (fullscreenElement !== frameWrap && !isMobileFullscreen) {
      frameWrap.style.removeProperty("--fullscreen-game-width");
      frameWrap.style.removeProperty("--fullscreen-game-height");
      frameWrap.style.removeProperty("--fullscreen-game-scale");
      return;
    }
    if (isTouchDevice()) {
      updateMobileOrientationClass(frameWrap);
    }
    // Responsive games resize their viewport through CSS instead of scaling a fixed canvas.
    if (frameWrap.classList.contains("responsive")) {
      return;
    }
    // Measure the wrapper so portrait rotation and safe-area padding are accounted for.
    const style = window.getComputedStyle(frameWrap);
    const availableWidth = frameWrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availableHeight = frameWrap.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const baseWidth = Number(frame.getAttribute("width")) || 960;
    const baseHeight = Number(frame.getAttribute("height")) || 540;
    const scale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight);

    frameWrap.style.setProperty("--fullscreen-game-width", `${baseWidth}px`);
    frameWrap.style.setProperty("--fullscreen-game-height", `${baseHeight}px`);
    frameWrap.style.setProperty("--fullscreen-game-scale", Math.max(scale, 0));
  }

  const activePlays = new Map();
  const pendingSaves = new Map();
  const cardMap = new Map();
  let activeSlug = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function formatMonthYear(value) {
    if (!value) {
      return "";
    }

    const monthYearMatch = String(value).match(/^(\d{4})-(\d{2})$/);
    let date;
    if (monthYearMatch) {
      const year = Number(monthYearMatch[1]);
      const monthIndex = Number(monthYearMatch[2]) - 1;
      date = new Date(year, monthIndex, 1);
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short"
    });
  }

  function getGameTitleLines(game, fallback = "") {
    if (Array.isArray(game?.title)) {
      return game.title.map((part) => String(part ?? "").trim()).filter(Boolean);
    }
    const mainTitle = String(game?.title ?? fallback).trim();
    const subtitle = String(game?.subtitle ?? "").trim();
    return [mainTitle, subtitle].filter(Boolean);
  }

  function getGameTitleText(game, fallback = "") {
    return getGameTitleLines(game, fallback).join(" ");
  }

  function renderGameCard(game) {
    const titleParts = getGameTitleLines(game, game.slug);
    const [mainTitle = "", subtitle = ""] = titleParts;
    const titleText = titleParts.join(" ");
    const titleLines = `<span class="game-title-line">${escapeHtml(mainTitle)}</span>${
      subtitle ? `<span class="game-title-line game-title-subtitle">${escapeHtml(subtitle)}</span>` : ""
    }`;
    const tags = Array.isArray(game.tags) ? game.tags : [];
    const pagePath = game.pagePath || `/game/?game=${game.slug}`;
    const externalUrl = game.externalUrl || "";
    const isExternal = Boolean(externalUrl);
    const titleHref = isExternal ? externalUrl : pagePath;
    const titleTargetAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
    const buildPath = game.buildPath || `Games/${game.slug}/index.html`;
    let buildUrl = buildPath;
    try {
      buildUrl = encodeURI(decodeURI(buildPath));
    } catch {
      buildUrl = buildPath;
    }
    let isItchEmbed = false;
    try {
      const url = new URL(buildUrl, window.location.href);
      isItchEmbed = url.hostname === "itch.io" && url.pathname.startsWith("/embed-upload/");
    } catch {
      // Local or invalid build paths do not have an itch.io footer.
    }
    const posterImage = game.posterImage || game.tileImage || game.browseImage;
    let posterUrl = "";
    if (posterImage) {
      try {
        posterUrl = encodeURI(decodeURI(posterImage));
      } catch {
        posterUrl = posterImage;
      }
    }
    const posterStyle = posterUrl
      ? ` style="--poster-image: url('${escapeHtml(posterUrl)}')"`
      : "";
    const metaLabel = game.published ? formatMonthYear(game.published) : "";
    const externalAction = isExternal
      ? `<a class="button ghost external-play-link" href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer">Play on Newgrounds</a>`
      : "";
    const overlayContent = isExternal
      ? "<span>Play on Newgrounds</span><small>Opens in a new tab</small>"
      : "<span>Play</span>";
    const frameButton = isExternal
      ? ""
      : '<button class="frame-fullscreen" type="button" aria-label="Fullscreen">Fullscreen</button>';

    return `
<article class="game-card" data-game="${escapeHtml(game.slug)}">
  <div class="game-meta">
    <h3><a class="game-title-link" href="${escapeHtml(titleHref)}"${titleTargetAttrs}>${titleLines}</a></h3>
    ${metaLabel ? `<div class="game-updated">${escapeHtml(metaLabel)}</div>` : ""}
    ${tags.length ? `<ul class="chips">${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>` : ""}
    <div class="game-stats">
      <div class="stat">
        <span class="stat-label">Plays</span>
        <span class="stat-value" data-stat="plays">--</span>
      </div>
      <div class="stat stat-hours">
        <span class="stat-label">Hours played</span>
        <span class="stat-value" data-stat="hours">--</span>
      </div>
    </div>
  </div>
  <div class="game-media">
    <div class="game-frame${game.responsive === true ? " responsive" : ""}"${posterStyle}>
      <div class="game-viewport${isItchEmbed ? " itch-embed" : ""}">
        <iframe
          title="${escapeHtml(titleText)}"
          data-src="${escapeHtml(isExternal ? "about:blank" : buildUrl)}"
          loading="lazy"
          allow="gamepad; pointer-lock; fullscreen 'none'"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          width="960"
          height="540"
        ></iframe>
      </div>
      <button class="play-overlay" type="button" aria-label="Click to play"${isExternal ? ` data-external-url="${escapeHtml(externalUrl)}"` : ""}>
        ${overlayContent}
      </button>
      ${frameButton}
    </div>
    <div class="game-frame-actions">
      <span>Controls: ${escapeHtml(game.controls)}</span>
      ${externalAction}
    </div>
  </div>
  <div class="game-community">
    <p>${escapeHtml(game.description)}</p>
    <a class="button primary" href="https://discord.gg/HENeTkyRPS" target="_blank" rel="noopener noreferrer">Give feedback on Discord Community</a>
  </div>
</article>
`;
  }

  function openExternalUrl(url) {
    if (!url) {
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function startPlay(slug) {
    if (activePlays.has(slug)) {
      return;
    }

    const play = { sessionId: crypto.randomUUID(), startedAt: Date.now() };
    activePlays.set(slug, play);
    savePlay(slug, play);
  }

  function showStatsError(error) {
    console.error("Convex play statistics failed", error);
    const alert = document.getElementById("setup-alert");
    if (alert) {
      alert.classList.add("visible");
    }
  }

  async function savePlay(slug, play, durationMs = Math.max(0, Date.now() - play.startedAt)) {
    const previous = pendingSaves.get(play.sessionId);
    const snapshot = { slug, play, durationMs: Math.max(previous?.durationMs ?? 0, durationMs) };
    pendingSaves.set(play.sessionId, snapshot);
    try {
      await convex.recordPlay(slug, play.sessionId, snapshot.durationMs);
      if (pendingSaves.get(play.sessionId) === snapshot) {
        pendingSaves.delete(play.sessionId);
      }
      await refreshStats(slug);
    } catch (error) {
      showStatsError(error);
    }
  }

  function endPlay(slug) {
    const play = activePlays.get(slug);
    if (!play) {
      return;
    }
    activePlays.delete(slug);
    return savePlay(slug, play);
  }

  async function refreshStats(slug) {
    const card = cardMap.get(slug);
    if (!card) {
      return;
    }

    try {
      const totals = await convex.stats(slug);
      card.querySelector('[data-stat="plays"]').textContent = totals.plays;
      card.querySelector('[data-stat="hours"]').textContent = formatHours(totals.durationMs);
    } catch (error) {
      showStatsError(error);
    }
  }

  function activateGame(slug) {
    if (activeSlug === slug) {
      return;
    }

    if (activeSlug) {
      pauseGame(activeSlug);
    }

    const card = cardMap.get(slug);
    if (!card) {
      return;
    }
    const frame = card.querySelector("iframe");
    if (!frame) {
      return;
    }

    card.classList.add("active");
    frame.dataset.playing = "true";
    const targetSrc = frame.dataset.src;
    if (targetSrc) {
      frame.setAttribute("src", targetSrc);
    }
    activeSlug = slug;
  }

  function pauseGame(slug) {
    const card = cardMap.get(slug);
    if (!card) {
      return;
    }
    const frame = card.querySelector("iframe");
    if (!frame) {
      return;
    }

    frame.dataset.playing = "false";
    frame.setAttribute("src", "about:blank");
    card.classList.remove("active");
    activeSlug = null;
    endPlay(slug);
  }

  async function finalizePlays() {
    const stopped = Array.from(pendingSaves.values()).filter(({ slug, play }) =>
      activePlays.get(slug) !== play);
    await Promise.all([
      ...Array.from(activePlays, ([slug, play]) => savePlay(slug, play)),
      ...stopped.map(({ slug, play, durationMs }) => savePlay(slug, play, durationMs))
    ]);
  }

  // Checkpoint long sessions and retry temporary network failures. Visibility and
  // pagehide saves keep the same session so returning to the tab keeps tracking.
  window.setInterval(finalizePlays, 30000);

  function initGameCard(card) {
    const slug = card.dataset.game;
    if (!slug) {
      return;
    }
    cardMap.set(slug, card);

    const frame = card.querySelector("iframe");
    if (frame) {
      frame.addEventListener("load", () => {
        if (frame.dataset.playing === "true" && frame.getAttribute("src") === frame.dataset.src) {
          startPlay(slug);
        }
      });
    }

    let enterFullscreen = () => {};
    const overlay = card.querySelector(".play-overlay");
    if (overlay) {
      overlay.addEventListener("click", () => {
        const externalUrl = overlay.dataset.externalUrl;
        if (externalUrl) {
          openExternalUrl(externalUrl);
          return;
        }
        activateGame(slug);
        enterFullscreen();
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const externalUrl = overlay.dataset.externalUrl;
          if (externalUrl) {
            openExternalUrl(externalUrl);
            return;
          }
          activateGame(slug);
          enterFullscreen();
        }
      });
    }

    const fullscreenBtn = card.querySelector(".frame-fullscreen");
    if (fullscreenBtn) {
      const frameWrap = card.querySelector(".game-frame");
      const applyFullscreenSizingForCard = () => applyFullscreenSizing(frameWrap, frame);
      const setMobileFullscreen = (enabled) => {
        if (!frameWrap) {
          return;
        }
        frameWrap.classList.toggle("mobile-fullscreen", enabled);
        if (!enabled) {
          frameWrap.classList.remove("mobile-portrait");
        }
        document.body.classList.toggle("mobile-fullscreen", enabled);
        if (enabled) {
          updateMobileOrientationClass(frameWrap);
          lockLandscapeOrientation();
        } else {
          unlockOrientation();
        }
        applyFullscreenSizingForCard();
      };
      const updateFullscreenUi = () => {
        if (!frameWrap) {
          return;
        }
        const isFullscreen = getFullscreenElement() === frameWrap || frameWrap.classList.contains("mobile-fullscreen");
        frameWrap.classList.toggle("fullscreen-view", isFullscreen);
        fullscreenBtn.textContent = isFullscreen ? "Exit fullscreen" : "Fullscreen";
        fullscreenBtn.setAttribute("aria-label", fullscreenBtn.textContent);
        applyFullscreenSizingForCard();
      };
      updateFullscreenUi();
      document.addEventListener("fullscreenchange", updateFullscreenUi);
      document.addEventListener("webkitfullscreenchange", updateFullscreenUi);
      window.addEventListener("resize", applyFullscreenSizingForCard);
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", applyFullscreenSizingForCard);
      }

      enterFullscreen = () => {
        if (!frameWrap) {
          return;
        }
        if (frame && frame.dataset.playing !== "true") {
          activateGame(slug);
        }
        if (isTouchDevice()) {
          setMobileFullscreen(true);
          updateFullscreenUi();
          return;
        }
        fullscreenIntent = frameWrap;
        requestFullscreen(frameWrap);
      };

      fullscreenBtn.addEventListener("click", () => {
        if (!frameWrap) {
          return;
        }
        if (frameWrap.classList.contains("mobile-fullscreen")) {
          setMobileFullscreen(false);
          updateFullscreenUi();
          return;
        }
        if (getFullscreenElement() === frameWrap) {
          fullscreenIntent = null;
          exitFullscreen();
          return;
        }
        enterFullscreen();
      });
    }

    refreshStats(slug);
  }

  function setupGameCards(container) {
    container.querySelectorAll("[data-game]").forEach((card) => initGameCard(card));
  }

  window.GameCards = {
    renderGameCard,
    setupGameCards,
    finalizePlays,
    formatDate,
    formatMonthYear,
    getGameTitleLines,
    getGameTitleText,
    escapeHtml
  };
})();
