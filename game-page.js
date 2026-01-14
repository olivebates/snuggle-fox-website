(() => {
  const container = document.getElementById("game-container");
  const alertEl = document.getElementById("setup-alert");

  if (window.SUPABASE_CLIENT) {
    window.SUPABASE_CLIENT.showSetupAlert(alertEl);
  }

  const slugFromBody = document.body.dataset.gameSlug;
  const slugFromQuery = new URLSearchParams(window.location.search).get("game");
  const slug = slugFromBody || slugFromQuery;

  if (!slug) {
    container.innerHTML = '<div class="notice">Missing game slug.</div>';
    return;
  }

  async function loadGame() {
    try {
      const response = await fetch("/games.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load games.json");
      }
      const games = await response.json();
      const game = games.find((item) => item.slug === slug);
      if (!game) {
        container.innerHTML = '<div class="notice">Game not found.</div>';
        return;
      }

      const titleEl = document.getElementById("game-title");
      const subtitleEl = document.getElementById("game-subtitle");
      const updatedEl = document.getElementById("game-updated");

      if (titleEl) {
        titleEl.textContent = game.title;
      }
      if (subtitleEl) {
        subtitleEl.textContent = game.description;
      }
      if (updatedEl) {
        updatedEl.textContent = game.updated ? `Updated ${window.GameCards.formatDate(game.updated)}` : "";
      }
      document.title = `${game.title} - SnuggleFox's Games`;

      container.innerHTML = window.GameCards.renderGameCard(game);
      window.GameCards.setupGameCards(container);
    } catch (error) {
      container.innerHTML = '<div class="notice">Unable to load game data. Check /games.json.</div>';
      console.error(error);
    }
  }

  loadGame();

  window.addEventListener("beforeunload", () => window.GameCards.finalizePlays());
  window.addEventListener("pagehide", () => window.GameCards.finalizePlays());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.GameCards.finalizePlays();
    }
  });
})();
