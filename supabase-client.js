(() => {
  const SUPABASE_URL = "https://txdbguivfziwrtylfunq.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4ZGJndWl2Znppd3J0eWxmdW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDU2MTIsImV4cCI6MjA4MzkyMTYxMn0.xFq1rR1PoMpPCHvBkawuke6yjASFKDhRL6vsXPN8tZo";

  const supabaseConfigured =
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("YOUR-PROJECT") &&
    !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY");

  const supabase = supabaseConfigured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          fetch: (input, init) => fetch(input, { ...init, keepalive: true })
        }
      })
    : null;

  function getClientId() {
    const key = "snugglefox_client_id";
    let value = localStorage.getItem(key);
    if (!value) {
      value = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now());
      localStorage.setItem(key, value);
    }
    return value;
  }

  function formatDuration(ms) {
    if (!ms || ms <= 0) {
      return "--";
    }
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remMinutes = minutes % 60;
      return `${hours}h ${String(remMinutes).padStart(2, "0")}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
    }
    return `${seconds}s`;
  }

  function showSetupAlert(element) {
    if (!element || supabaseConfigured) {
      return;
    }
    element.classList.add("visible");
  }

  window.SUPABASE_CLIENT = {
    supabase,
    supabaseConfigured,
    clientId: getClientId(),
    formatDuration,
    showSetupAlert
  };
})();
