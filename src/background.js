// Service worker: the only place that talks to the local tomoshi-ja-dict server.
//
// All network goes through here (not the content script) because requests from
// the extension origin with host_permissions are the most reliable across
// Chrome's mixed-content / Private Network Access rules.

const PORTS = [21420, 21421, 21422];

// Cached base URL of the running server. Cleared whenever a request fails so the
// next call re-probes (the desktop app may have been started/stopped/moved port).
let cachedBase = null;

// fetch with a hard timeout, so a non-responsive port can never leave the popup
// hanging on "查询中…" forever.
async function fetchWithTimeout(url, optionsOrTimeout, maybeTimeout) {
  const hasOptions = typeof optionsOrTimeout === "object" && optionsOrTimeout !== null;
  const options = hasOptions ? optionsOrTimeout : {};
  const timeoutMs = hasOptions ? maybeTimeout : optionsOrTimeout;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal, ...options });
  } finally {
    clearTimeout(timer);
  }
}

async function probeBase() {
  // Probe all candidate ports in parallel so a down app is reported quickly.
  const results = await Promise.allSettled(
    PORTS.map(async (port) => {
      const base = `http://127.0.0.1:${port}`;
      // Short timeout: a live local server answers in well under 50ms, so this
      // only bounds the "nothing listening / connection hangs" case.
      const res = await fetchWithTimeout(`${base}/v1/health`, 600);
      const body = res.ok ? await res.json() : null;
      if (body && body.ok && body.name === "tomoshi-ja-dict") return base;
      throw new Error("not tomoshi-ja-dict");
    })
  );
  for (const r of results) {
    if (r.status === "fulfilled") return r.value;
  }
  return null;
}

// Dedup concurrent probes (e.g. the startup warm-up and the first lookup) so
// a down app is probed once, not several times in parallel.
let probing = null;
async function getBase() {
  if (cachedBase) return cachedBase;
  if (!probing) probing = probeBase();
  try {
    const base = await probing;
    if (base) cachedBase = base;
    return base;
  } finally {
    probing = null;
  }
}

async function apiGet(path, timeoutMs = 6000) {
  const base = await getBase();
  if (!base) return { ok: false, reason: "offline" };
  try {
    const res = await fetchWithTimeout(`${base}${path}`, timeoutMs);
    if (!res.ok) return { ok: false, reason: "server", status: res.status };
    return { ok: true, data: await res.json() };
  } catch (_) {
    cachedBase = null; // server vanished — force a re-probe next time
    return { ok: false, reason: "offline" };
  }
}

async function lookup(q, limit) {
  const r = await apiGet(`/v1/lookup?q=${encodeURIComponent(q)}&limit=${limit || 8}`);
  return r.ok ? { ok: true, entries: r.data } : r;
}

async function recordHistory(q, entryRef) {
  const base = await getBase();
  if (!base) return { ok: false, reason: "offline" };
  try {
    const res = await fetchWithTimeout(
      `${base}/v1/history`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, entry_ref: entryRef || null }),
      },
      3000
    );
    return res.ok ? { ok: true } : { ok: false, reason: "server" };
  } catch (_) {
    return { ok: false, reason: "offline" };
  }
}

async function addFavorite(payload) {
  const base = await getBase();
  if (!base) return { ok: false, reason: "offline" };
  try {
    const res = await fetchWithTimeout(
      `${base}/v1/favorite`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_id: payload.entryId,
          word: payload.word,
          reading: payload.reading || null,
          meaning: payload.meaning || null,
        }),
      },
      3000
    );
    return res.ok ? { ok: true } : { ok: false, reason: "server" };
  } catch (_) {
    return { ok: false, reason: "offline" };
  }
}

async function favoriteStatus(entryId) {
  const r = await apiGet(`/v1/favorite?entry_id=${encodeURIComponent(entryId)}`);
  return r.ok ? { ok: true, favorited: !!(r.data && r.data.favorited) } : r;
}

async function removeFavorite(payload) {
  const base = await getBase();
  if (!base) return { ok: false, reason: "offline" };
  try {
    const res = await fetchWithTimeout(
      `${base}/v1/unfavorite`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: payload.entryId }),
      },
      3000
    );
    return res.ok ? { ok: true } : { ok: false, reason: "server" };
  } catch (_) {
    return { ok: false, reason: "offline" };
  }
}

// Raise the desktop app window and open the full entry for `q` there. Backs the
// popup's "显示详情" button; the app focuses its window and routes to the results.
async function reveal(q) {
  const base = await getBase();
  if (!base) return { ok: false, reason: "offline" };
  try {
    const res = await fetchWithTimeout(
      `${base}/v1/reveal`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      },
      3000
    );
    return res.ok ? { ok: true } : { ok: false, reason: "server" };
  } catch (_) {
    cachedBase = null; // server vanished — force a re-probe next time
    return { ok: false, reason: "offline" };
  }
}

async function grammar(q, limit) {
  const r = await apiGet(`/v1/grammar?q=${encodeURIComponent(q)}&limit=${limit || 5}`);
  return r.ok ? { ok: true, entries: r.data } : r;
}

async function pitch(surface, reading) {
  const r = await apiGet(
    `/v1/pitch?surface=${encodeURIComponent(surface)}&reading=${encodeURIComponent(reading)}`
  );
  return r.ok ? { ok: true, accent: r.data } : r; // accent may be null (no data)
}

// --- Audio: synthesize via the server, play in an offscreen document ---------

let creatingOffscreen = null;

async function hasOffscreen() {
  if (chrome.runtime.getContexts) {
    const ctxs = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
    });
    return ctxs.length > 0;
  }
  return false;
}

async function ensureOffscreen() {
  if (await hasOffscreen()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: "src/offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "播放本地 tomoshi-ja-dict 返回的单词发音音频。",
      })
      .catch(() => {}); // swallow "a document already exists" races
  }
  await creatingOffscreen;
  creatingOffscreen = null;
}

async function tts(text, reading) {
  const params =
    `text=${encodeURIComponent(text)}` + (reading ? `&reading=${encodeURIComponent(reading)}` : "");
  const r = await apiGet(`/v1/tts?${params}`, 20000); // VOICEVOX synthesis can be slow
  if (!r.ok) {
    // A 502 from the server means the VOICEVOX engine is unreachable.
    return { ok: false, reason: r.reason === "offline" ? "offline" : "engine" };
  }
  const audio = r.data && r.data.audio;
  if (!audio) return { ok: false, reason: "engine" };
  // The server synthesizes rate-neutral (1.0×) and tells us the playback speed
  // to apply (see docs/ws-c-gateway-plan.md §3.3); default to 1 if absent.
  const speed = (r.data && typeof r.data.speed === "number" && r.data.speed) || 1;
  await ensureOffscreen();
  chrome.runtime.sendMessage({ target: "offscreen", type: "play", audio, speed });
  return { ok: true };
}

// Always answer, even if the promise rejects, so the content script's popup
// never hangs waiting for a reply that never arrives.
function respond(promise, sendResponse) {
  promise.then(sendResponse, () => sendResponse({ ok: false, reason: "offline" }));
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return;
  switch (msg.type) {
    case "lookup":
      respond(lookup(msg.q, msg.limit), sendResponse);
      return true; // keep the message channel open for the async response
    case "grammar":
      respond(grammar(msg.q, msg.limit), sendResponse);
      return true;
    case "pitch":
      respond(pitch(msg.surface, msg.reading), sendResponse);
      return true;
    case "tts":
      respond(tts(msg.text, msg.reading), sendResponse);
      return true;
    case "recordHistory":
      respond(recordHistory(msg.q, msg.entryRef), sendResponse);
      return true;
    case "favorite":
      respond(addFavorite(msg), sendResponse);
      return true;
    case "favoriteStatus":
      respond(favoriteStatus(msg.entryId), sendResponse);
      return true;
    case "unfavorite":
      respond(removeFavorite(msg), sendResponse);
      return true;
    case "reveal":
      respond(reveal(msg.q), sendResponse);
      return true;
    case "ping":
      respond(
        getBase().then((base) => ({ ok: !!base, base })),
        sendResponse
      );
      return true;
    default:
      return; // not handled
  }
});

// First install only (not updates / Chrome upgrades): open the options page so
// the user can pick the language / trigger key, and — when the desktop app
// isn't running — see the connection hint with the tomoshi.app download link.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});

// Probe once on startup so the first lookup is warm.
getBase().then((base) => {
  console.log(
    base
      ? `tomoshi-ja-dict connected: ${base}`
      : "tomoshi-ja-dict server not found (is the desktop app running?)"
  );
});
