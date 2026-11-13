(() => {
  const CONVEX_URL = "https://animated-curlew-362.convex.cloud";

  async function call(type, path, args) {
    const response = await fetch(`${CONVEX_URL}/api/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args, format: "json" }),
      keepalive: true
    });
    const result = await response.json();
    if (!response.ok || result.status !== "success") {
      throw new Error(result.errorMessage || "Unable to load play statistics.");
    }
    return result.value;
  }

  window.CONVEX_CLIENT = {
    stats: (gameSlug) => call("query", "plays:stats", { gameSlug }),
    recordPlay: (gameSlug, sessionId, durationMs) =>
      call("mutation", "plays:record", { gameSlug, sessionId, durationMs })
  };
})();
