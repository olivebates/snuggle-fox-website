(() => {
  const listEl = document.getElementById("games-list");
  const alertEl = document.getElementById("setup-alert");

  if (window.SUPABASE_CLIENT) {
    window.SUPABASE_CLIENT.showSetupAlert(alertEl);
  }

  async function loadGames() {
    try {
      const response = await fetch("games.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load games.json");
      }
      const games = await response.json();
      games.sort((a, b) => new Date(b.updated) - new Date(a.updated));
      listEl.innerHTML = games.map((game) => window.GameCards.renderGameCard(game)).join("");
      window.GameCards.setupGameCards(listEl);
    } catch (error) {
      listEl.innerHTML = '<div class="notice">Unable to load game data. Check games.json.</div>';
      console.error(error);
    }
  }

  loadGames();

  window.addEventListener("beforeunload", () => window.GameCards.finalizePlays());
  window.addEventListener("pagehide", () => window.GameCards.finalizePlays());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.GameCards.finalizePlays();
    }
  });
})();
