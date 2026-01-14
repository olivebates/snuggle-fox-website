(() => {
  const supabaseClient = window.SUPABASE_CLIENT || {};
  const supabase = supabaseClient.supabase || null;
  const clientId = supabaseClient.clientId || "anonymous";

  function formatHours(ms) {
    if (!ms || ms <= 0) {
      return "--";
    }
    const hours = ms / 3600000;
    return `${hours.toFixed(2)}h`;
  }

  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
  }

  function requestFullscreen(element) {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
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

  function applyFullscreenSizing(frameWrap, frame) {
    if (!frameWrap || !frame) {
      return;
    }
    const fullscreenElement = getFullscreenElement();
    if (fullscreenElement !== frameWrap) {
      frame.style.removeProperty("width");
      frame.style.removeProperty("height");
      return;
    }
    if (!isTouchDevice()) {
      return;
    }

    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    if (window.visualViewport) {
      viewportWidth = window.visualViewport.width;
      viewportHeight = window.visualViewport.height;
    }

    const aspect = 16 / 9;
    const targetWidth = Math.min(viewportWidth, viewportHeight * aspect);
    const targetHeight = targetWidth / aspect;
    frame.style.width = `${Math.floor(targetWidth)}px`;
    frame.style.height = `${Math.floor(targetHeight)}px`;
  }

  const activePlays = new Map();
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

  function renderGameCard(game) {
    const tags = Array.isArray(game.tags) ? game.tags : [];
    const pagePath = game.pagePath || `game.html?game=${game.slug}`;
    const buildPath = game.buildPath || `Games/${game.slug}/index.html`;
    let buildUrl = buildPath;
    try {
      buildUrl = encodeURI(decodeURI(buildPath));
    } catch {
      buildUrl = buildPath;
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
    const updatedLabel = game.updated ? `Updated ${formatDate(game.updated)}` : "";

    return `
<article class="game-card" data-game="${escapeHtml(game.slug)}">
  <div class="game-meta">
    ${updatedLabel ? `<div class="game-updated">${escapeHtml(updatedLabel)}</div>` : ""}
    <h3><a class="game-title-link" href="${escapeHtml(pagePath)}">${escapeHtml(game.title)}</a></h3>
    <p>${escapeHtml(game.description)}</p>
    ${tags.length ? `<ul class="chips">${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>` : ""}
    <div class="game-stats">
      <div class="stat">
        <span class="stat-label">Plays</span>
        <span class="stat-value" data-stat="plays">--</span>
      </div>
      <div class="stat stat-likes">
        <span class="stat-label">Likes</span>
        <div class="stat-value-row">
          <span class="stat-value" data-stat="likes">--</span>
          <button class="rate-btn inline-like" data-rate="1" type="button" aria-label="Like">👍</button>
        </div>
      </div>
      <div class="stat stat-hours">
        <span class="stat-label">Hours played</span>
        <span class="stat-value" data-stat="hours">--</span>
      </div>
    </div>
    <div class="rating">
      <button class="rate-btn" data-rate="1" type="button" aria-label="Like">👍</button>
      <button class="rate-btn" data-rate="-1" type="button" aria-label="Dislike">👎</button>
      <span class="rating-note" data-rate-note>Rate this game</span>
    </div>
  </div>
  <div class="game-media">
    <div class="game-frame"${posterStyle}>
      <iframe
        title="${escapeHtml(game.title)}"
        data-src="${escapeHtml(buildUrl)}"
        loading="lazy"
        allow="gamepad; pointer-lock; fullscreen 'none'"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
        width="960"
        height="540"
      ></iframe>
      <button class="play-overlay" type="button" aria-label="Click to play">
        <span>Play</span>
      </button>
      <button class="frame-fullscreen" type="button" aria-label="Fullscreen">Fullscreen</button>
    </div>
    <div class="game-frame-actions">
      <span>Controls: ${escapeHtml(game.controls)}</span>
    </div>
  </div>
  <div class="comment-wrap">
    <form class="comment-form" data-comment-form>
      <input type="text" name="name" placeholder="Name (optional)" maxlength="40">
      <textarea name="comment" placeholder="Write a short comment" maxlength="500" required></textarea>
      <button class="button primary" type="submit">Post comment</button>
    </form>
    <div class="comment-list" data-comment-list></div>
  </div>
</article>
`;
  }

  async function startPlay(slug) {
    if (!supabase) {
      return;
    }
    if (activePlays.has(slug)) {
      return;
    }

    const startedAt = Date.now();
    const { data, error } = await supabase
      .from("play_sessions")
      .insert({
        game_slug: slug,
        client_id: clientId,
        started_at: new Date(startedAt).toISOString()
      })
      .select("id")
      .single();

    if (error) {
      console.error("Play insert failed", error);
      return;
    }

    activePlays.set(slug, { id: data.id, startedAt, ended: false });
    refreshStats(slug);
  }

  async function endPlay(slug) {
    if (!supabase) {
      return;
    }
    const play = activePlays.get(slug);
    if (!play || play.ended) {
      return;
    }
    play.ended = true;
    const durationMs = Date.now() - play.startedAt;

    const { error } = await supabase
      .from("play_sessions")
      .update({
        ended_at: new Date().toISOString(),
        duration_ms: durationMs
      })
      .eq("id", play.id);

    if (error) {
      console.error("Play update failed", error);
      return;
    }

    activePlays.delete(slug);
    refreshStats(slug);
  }

  async function refreshStats(slug) {
    if (!supabase) {
      return;
    }

    const card = cardMap.get(slug);
    if (!card) {
      return;
    }

    const playsQuery = supabase
      .from("play_sessions")
      .select("id", { count: "exact", head: true })
      .eq("game_slug", slug);

    const likesQuery = supabase
      .from("ratings")
      .select("id", { count: "exact", head: true })
      .eq("game_slug", slug)
      .eq("value", 1);

    const durationQuery = supabase
      .from("play_sessions")
      .select("duration_ms")
      .eq("game_slug", slug)
      .not("duration_ms", "is", null);

    const [playsResult, likesResult, durationResult] = await Promise.all([
      playsQuery,
      likesQuery,
      durationQuery
    ]);

    const playsValue = playsResult.count ?? 0;
    const likesValue = likesResult.count ?? 0;
    const durations = durationResult.data || [];
    const totalDuration = durations.reduce((sum, row) => sum + (row.duration_ms || 0), 0);

    card.querySelector('[data-stat="plays"]').textContent = playsValue;
    card.querySelector('[data-stat="likes"]').textContent = likesValue;
    card.querySelector('[data-stat="hours"]').textContent = formatHours(totalDuration);
  }

  async function refreshUserRating(slug) {
    if (!supabase) {
      return;
    }

    const { data } = await supabase
      .from("ratings")
      .select("value")
      .eq("game_slug", slug)
      .eq("client_id", clientId)
      .maybeSingle();

    if (data) {
      setRatingUi(slug, data.value);
    }
  }

  function setRatingUi(slug, value) {
    const card = cardMap.get(slug);
    if (!card) {
      return;
    }
    const buttons = card.querySelectorAll(".rate-btn");
    buttons.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.rate) === value);
    });
    const note = card.querySelector("[data-rate-note]");
    if (note) {
      note.textContent = value === 1 ? "Thanks for the like" : "Thanks for the feedback";
    }
  }

  async function submitRating(slug, value) {
    if (!supabase) {
      return;
    }
    const { error } = await supabase
      .from("ratings")
      .upsert(
        {
          game_slug: slug,
          client_id: clientId,
          value: value
        },
        { onConflict: "game_slug,client_id" }
      );

    if (error) {
      console.error("Rating failed", error);
      return;
    }

    setRatingUi(slug, value);
    refreshStats(slug);
  }

  async function loadComments(slug) {
    if (!supabase) {
      return;
    }
    const card = cardMap.get(slug);
    if (!card) {
      return;
    }
    const list = card.querySelector("[data-comment-list]");
    list.innerHTML = "";

    const { data, error } = await supabase
      .from("comments")
      .select("display_name, body, created_at")
      .eq("game_slug", slug)
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      console.error("Comments load failed", error);
      return;
    }

    if (!data || data.length === 0) {
      const empty = document.createElement("div");
      empty.className = "comment";
      empty.textContent = "No comments yet. Be the first to say hi.";
      list.appendChild(empty);
      return;
    }

    data.forEach((comment) => {
      const item = document.createElement("div");
      item.className = "comment";

      const header = document.createElement("div");
      header.className = "comment-header";
      const name = document.createElement("span");
      name.textContent = comment.display_name || "Anonymous";
      const date = document.createElement("span");
      const created = new Date(comment.created_at);
      date.textContent = created.toLocaleDateString();
      header.appendChild(name);
      header.appendChild(date);

      const body = document.createElement("p");
      body.className = "comment-body";
      body.textContent = comment.body;

      item.appendChild(header);
      item.appendChild(body);
      list.appendChild(item);
    });
  }

  async function submitComment(slug, form) {
    if (!supabase) {
      return;
    }
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const comment = String(formData.get("comment") || "").trim();
    if (!comment) {
      return;
    }

    const { error } = await supabase.from("comments").insert({
      game_slug: slug,
      client_id: clientId,
      display_name: name || null,
      body: comment
    });

    if (error) {
      console.error("Comment failed", error);
      return;
    }

    form.reset();
    loadComments(slug);
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
    if (!supabase) {
      return;
    }
    const slugs = Array.from(activePlays.keys());
    await Promise.all(slugs.map((slug) => endPlay(slug)));
  }

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

    const overlay = card.querySelector(".play-overlay");
    if (overlay) {
      overlay.addEventListener("click", () => activateGame(slug));
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateGame(slug);
        }
      });
    }

    const fullscreenBtn = card.querySelector(".frame-fullscreen");
    if (fullscreenBtn) {
      const frameWrap = card.querySelector(".game-frame");
      const applyFullscreenSizingForCard = () => applyFullscreenSizing(frameWrap, frame);
      const updateFullscreenUi = () => {
        if (!frameWrap) {
          return;
        }
        const isFullscreen = getFullscreenElement() === frameWrap;
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

      fullscreenBtn.addEventListener("click", () => {
        if (!frameWrap) {
          return;
        }
        if (getFullscreenElement() === frameWrap) {
          fullscreenIntent = null;
          exitFullscreen();
          return;
        }
        if (frame && frame.dataset.playing !== "true") {
          activateGame(slug);
        }
        fullscreenIntent = frameWrap;
        requestFullscreen(frameWrap);
      });
    }

    const rateButtons = card.querySelectorAll(".rate-btn");
    rateButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = Number(btn.dataset.rate);
        submitRating(slug, value);
      });
    });

    const form = card.querySelector("[data-comment-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        submitComment(slug, form);
      });
    }

    if (supabase) {
      refreshStats(slug);
      refreshUserRating(slug);
      loadComments(slug);
    }
  }

  function setupGameCards(container) {
    container.querySelectorAll("[data-game]").forEach((card) => initGameCard(card));
  }

  window.GameCards = {
    renderGameCard,
    setupGameCards,
    finalizePlays,
    formatDate,
    escapeHtml
  };
})();
