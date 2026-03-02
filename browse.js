(() => {
  const listEl = document.getElementById("browse-list");
  if (!listEl) {
    return;
  }

  function getTitleText(game) {
    const title = String(game.title || game.slug || "").trim();
    const subtitle = String(game.subtitle || "").trim();
    return [title, subtitle].filter(Boolean).join(" ");
  }

  function getTitleParts(game) {
    const title = String(game.title || game.slug || "").trim();
    const subtitle = String(game.subtitle || "").trim();
    return { title, subtitle };
  }

  async function loadBrowse() {
    try {
      const response = await fetch("/games.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load games.json");
      }
      const games = await response.json();
      games.sort((a, b) =>
        getTitleText(a).localeCompare(getTitleText(b), undefined, { sensitivity: "base" })
      );

      listEl.innerHTML = "";
      games.forEach((game) => {
        const link = document.createElement("a");
        link.className = "browse-tile";
        const { title, subtitle } = getTitleParts(game);
        const titleEl = document.createElement("span");
        titleEl.className = "browse-title-line";
        titleEl.textContent = title;
        link.appendChild(titleEl);
        if (subtitle) {
          const subtitleEl = document.createElement("span");
          subtitleEl.className = "browse-title-line browse-title-subtitle";
          subtitleEl.textContent = subtitle;
          link.appendChild(subtitleEl);
        }
        link.href = game.pagePath || `/game/?game=${encodeURIComponent(game.slug || "")}`;
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
      listEl.innerHTML = '<div class="notice">Unable to load game data. Check /games.json.</div>';
      console.error(error);
    }
  }

  loadBrowse();
})();
