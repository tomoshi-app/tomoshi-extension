// Service worker: the only place that talks to the local tomoshi-ja-dict server.
//
// All network goes through here (not the content script) because requests from
// the extension origin with host_permissions are the most reliable across
// Chrome's mixed-content / Private Network Access rules.

const PORTS = [21420, 21421, 21422];

// The stores hand the extension to every platform their browser runs on, but
// the desktop app it depends on ships for Windows and macOS only — everywhere
// else "start the desktop app" is a dead end. Detected once per service-worker
// life; connection failures are relabeled from "offline" to "unsupported_os"
// in respond() so each surface can say so honestly.
//
// Probing itself stays untouched: the ports are still tried, so any setup that
// does reach a local server keeps working.
//
// `getPlatformInfo` has no SteamOS value — Arch-based SteamOS reports as plain
// "linux", so the Steam Deck rides along on that entry. An OS absent from the
// label map falls back to its raw value rather than to null: an unknown future
// platform still can't run the desktop app, and an odd-looking name beats
// sending the user back into the dead end.
//
// "ios" isn't in Chrome's enum (iOS has no Chrome extension platform at all),
// but it is in the cross-browser one and Safari Web Extensions do run on
// iOS/iPadOS — labeled here so the Safari build reads right if it ever ships
// there. Safari without `getPlatformInfo` falls back to the normal offline
// path via the guard below.
const DESKTOP_OS = ["win", "mac"];
const OS_LABELS = {
  cros: "ChromeOS",
  linux: "Linux",
  android: "Android",
  ios: "iOS",
  openbsd: "OpenBSD",
};

let unsupportedOs = null; // display name, or null on Windows/macOS
try {
  if (chrome.runtime.getPlatformInfo) {
    chrome.runtime.getPlatformInfo((info) => {
      const os = info && info.os;
      unsupportedOs = os && !DESKTOP_OS.includes(os) ? OS_LABELS[os] || os : null;
    });
  }
} catch (_) {
  // Safari may not implement it — and only ships on macOS anyway.
}

/** True when the offscreen API exists (Chromium); false on Safari. */
function canUseOffscreen() {
  return typeof chrome.offscreen !== "undefined";
}

// Oldest desktop app the Safari build works with. Bump it whenever that build
// starts depending on a server capability older apps lack — currently
// `play=true` on /v1/tts (the app plays the audio itself for Safari, which has
// no `chrome.offscreen` to play it locally), added in 0.97.0.
//
// Chromium never depends on this: it plays audio itself via an offscreen
// document, a path that works against any server version (it's the original,
// always-supported response shape). `isOutdated` below short-circuits to
// `false` there, so this whole capability gate only ever fires on Safari.
//
// This matters because the two update channels run at very different speeds:
// the store pushes the extension silently within hours, while the desktop app
// only updates when the user launches it. "New extension + old app" is the
// normal state after a release, not an edge case.
const MIN_APP_VERSION = "0.97.0";

// Cached base URL and version of the running server. Cleared whenever a request
// fails so the next call re-probes (the desktop app may have been
// started/stopped/moved port, or updated in place).
let cachedBase = null;
let cachedVersion = null;

function forgetServer() {
  cachedBase = null;
  cachedVersion = null;
}

// Compare dotted numeric versions. A pre-release suffix ("0.96.0-rc.1") is
// dropped: an rc of the version that introduced a capability already has it.
function versionLt(a, b) {
  const parse = (v) =>
    String(v)
      .split("-")[0]
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d !== 0) return d < 0;
  }
  return false;
}

// A missing version counts as outdated: /v1/health has reported `version` since
// the endpoint was introduced, so its absence means anything but a current build.
//
// Chromium is never outdated by this measure — see `MIN_APP_VERSION`.
function isOutdated(version) {
  if (canUseOffscreen()) return false;
  return !version || versionLt(version, MIN_APP_VERSION);
}

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
      if (body && body.ok && body.name === "tomoshi-ja-dict") {
        return { base, version: typeof body.version === "string" ? body.version : null };
      }
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
    const found = await probing;
    if (found) {
      cachedBase = found.base;
      cachedVersion = found.version;
    }
    return found ? found.base : null;
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
    forgetServer(); // server vanished — force a re-probe next time
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
    forgetServer(); // server vanished — force a re-probe next time
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

// --- Audio: synthesize via the server ----------------------------------------
//
// Two playback paths, picked by what the browser can actually do:
//
//   Chromium — an offscreen document plays the returned data URL. Playing at
//   the extension origin sidesteps the host page's `media-src` CSP.
//
//   Safari — no `chrome.offscreen`, and the background page is destroyed the
//   moment the message handler settles, so an `Audio` element created here
//   dies before it loads. Instead `play=true` tells the desktop app to play
//   it: the sound comes from the app rather than the tab, but no browser audio
//   context is involved at all.

let creatingOffscreen = null;

async function tts(text, reading) {
  // Without offscreen the app plays it for us and returns no audio.
  const inApp = !canUseOffscreen();
  const params =
    `text=${encodeURIComponent(text)}` +
    (reading ? `&reading=${encodeURIComponent(reading)}` : "") +
    (inApp ? "&play=true" : "");
  const r = await apiGet(`/v1/tts?${params}`, 20000); // VOICEVOX synthesis can be slow
  if (!r.ok) {
    // A 502 from the server means the VOICEVOX engine is unreachable.
    return { ok: false, reason: r.reason === "offline" ? "offline" : "engine" };
  }
  if (inApp) {
    // Capability check rather than a version check, because it is exact: a
    // pre-0.97.0 app silently ignores the unknown `play` param and hands the
    // audio back for the extension to play — Safari has no offscreen player to
    // fall back to, so the user would get silence and no error. A non-empty
    // `audio` here is precisely that case.
    // `min` rides along so the in-page popup can name the target version
    // without hardcoding it in the UI layer.
    if (r.data && r.data.audio) return { ok: false, reason: "outdated", min: MIN_APP_VERSION };
    return { ok: true };
  }
  const audio = r.data && r.data.audio;
  if (!audio) return { ok: false, reason: "engine" };
  // The server synthesizes rate-neutral (1.0×) and tells us the playback speed
  // to apply (see docs/archived/ws-c-gateway-plan.md §3.3); default to 1 if absent.
  const speed = (r.data && typeof r.data.speed === "number" && r.data.speed) || 1;
  // A failed ensureOffscreen means there is no document to receive the `play`
  // message — sending it anyway would silently go nowhere.
  if (!(await ensureOffscreen())) return { ok: false, reason: "engine" };
  chrome.runtime.sendMessage({ target: "offscreen", type: "play", audio, speed });
  return { ok: true };
}

async function hasOffscreen() {
  if (chrome.runtime.getContexts) {
    const ctxs = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
    });
    return ctxs.length > 0;
  }
  return false;
}

/** Resolves true once an offscreen document exists (or is believed to). */
async function ensureOffscreen() {
  if (await hasOffscreen()) return true;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: "src/offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "播放本地 tomoshi-ja-dict 返回的单词发音音频。",
      })
      .then(() => true)
      .catch(async (err) => {
        // A concurrent creation race ("a document already exists") is benign:
        // hasOffscreen() will now see it. Anything else — permission denied,
        // offscreen.html missing, ... — is a real failure; without this check
        // it was swallowed unconditionally, so the caller kept sending `play`
        // to a document that was never created (silence, no error anywhere).
        // Note: on Chrome 109–115 (no `chrome.runtime.getContexts`, see
        // `hasOffscreen`) this can't tell the two cases apart and always warns
        // — a false positive there, not a functional problem.
        const exists = await hasOffscreen();
        if (!exists) console.warn("tomoshi-ja-dict: failed to create offscreen document:", err);
        return exists;
      });
  }
  const ready = await creatingOffscreen;
  creatingOffscreen = null;
  return ready;
}

// Always answer, even if the promise rejects, so the content script's popup
// never hangs waiting for a reply that never arrives.
//
// Single choke point for every background-mediated result, which is where the
// unsupported-platform relabeling happens: "offline" means "app not running
// yet", but where the app can never run at all the UI needs to tell those
// apart. The display name rides along so no other layer needs its own map.
function respond(promise, sendResponse) {
  const relabel = (res) =>
    unsupportedOs && res && !res.ok && res.reason === "offline"
      ? { ...res, reason: "unsupported_os", os: unsupportedOs }
      : res;
  promise.then(
    (res) => sendResponse(relabel(res)),
    () => sendResponse(relabel({ ok: false, reason: "offline" }))
  );
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
      // Re-probe while we believe the app is outdated: a desktop update restarts
      // the server on the same port, so requests keep succeeding and the cached
      // version would never be refreshed — leaving the warning (and the options
      // page's "重新检测" button) stuck after the user has already updated.
      if (cachedBase && isOutdated(cachedVersion)) forgetServer();
      respond(
        getBase().then((base) => ({
          ok: !!base,
          base,
          version: cachedVersion,
          min: MIN_APP_VERSION,
          outdated: !!base && isOutdated(cachedVersion),
          // Platform display name, or null where the app can run. Lets
          // popup/options render the unsupported-platform status when
          // disconnected (this response has no `reason` for respond() to relabel).
          unsupportedOs,
        })),
        sendResponse
      );
      return true;
    default:
      return; // not handled
  }
});

// Last manifest version we already reacted to, in chrome.storage.local (per
// browser profile, never synced — "have I greeted this install yet" is a
// property of this browser, not of the account).
const SEEN_VERSION_KEY = "seenExtensionVersion";

// On first install: open the options page so the user can pick the language /
// trigger key, and — when the desktop app isn't running — see the connection
// hint with the tomoshi.app download link.
//
// On an update: open it only when the app is running *and* too old for this
// build, since that user's pronunciation would otherwise just go quiet. A
// current app (or none running) sees nothing; the status line in the popup and
// options page covers the rest.
//
// `details.reason` alone can't carry that, because the Safari build isn't
// installed from a store: it's an appex inside Tomoshi.app, so every desktop
// update replaces the bundle and Safari re-registers the extension — firing
// onInstalled with reason "install" even though the extension itself is byte
// for byte the one already there. That is what made the options page pop up
// after every desktop update. So the decision hangs on the manifest version
// instead: it only moves when the extension really changed. Same version as
// last time = a re-registration, nothing to show. On Chromium the reason is
// trustworthy and this gate simply never fires.
//
// One-time cost of introducing the marker: an existing install has no stored
// version, so the first re-registration after this ships still reads as a first
// install and opens the page once more. From then on it's quiet.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install" && details.reason !== "update") return; // browser update: nothing to say
  const version = chrome.runtime.getManifest().version;
  chrome.storage.local.get({ [SEEN_VERSION_KEY]: null }, (state) => {
    const seen = state[SEEN_VERSION_KEY];
    if (seen === version) return; // same build re-registered — nothing is new
    chrome.storage.local.set({ [SEEN_VERSION_KEY]: version });

    if (!seen && details.reason === "install") {
      chrome.runtime.openOptionsPage();
      return;
    }
    getBase().then((base) => {
      if (base && isOutdated(cachedVersion)) chrome.runtime.openOptionsPage();
    });
  });
});

// Probe once on startup so the first lookup is warm.
getBase().then((base) => {
  console.log(
    base
      ? `tomoshi-ja-dict connected: ${base} (v${cachedVersion || "?"})` +
          (isOutdated(cachedVersion) ? ` — older than required v${MIN_APP_VERSION}` : "")
      : "tomoshi-ja-dict server not found (is the desktop app running?)"
  );
});
