(() => {
  const listEl = document.getElementById("browse-list");
  if (!listEl) {
    return;
  }

  async function loadBrowse() {
    try {
      const response = await fetch("games.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load games.json");
      }
      const games = await response.json();
      games.sort((a, b) =>
        String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" })
      );

      listEl.innerHTML = "";
      games.forEach((game) => {
        const link = document.createElement("a");
        link.className = "browse-tile";
        link.textContent = game.title || game.slug;
        link.href = game.pagePath || `game.html?game=${encodeURIComponent(game.slug || "")}`;
        const tileImage = game.tileImage || game.browseImage;
        if (tileImage) {
          let imageUrl = tileImage;
          try {
            imageUrl = encodeURI(decodeURI(tileImage));
          } catch {
            imageUrl = tileImage;
          }
          link.style.setProperty("--tile-image", `url("${imageUrl}")`);
        }
        listEl.appendChild(link);
      });
    } catch (error) {
      listEl.innerHTML = '<div class="notice">Unable to load game data. Check games.json.</div>';
      console.error(error);
    }
  }

  loadBrowse();
})();
