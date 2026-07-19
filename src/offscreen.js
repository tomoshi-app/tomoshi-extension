// Plays a data: audio URL handed over by the service worker. Only messages
// addressed to the offscreen document are handled, so it ignores the unrelated
// lookup/grammar/pitch traffic on the same runtime channel.

let current = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.target !== "offscreen") return;
  if (msg.type === "play" && msg.audio) {
    try {
      if (current) current.pause();
      current = new Audio(msg.audio);
      // Audio is synthesized rate-neutral (1.0×); apply the requested word/
      // sentence speed at playback, keeping pitch natural.
      current.preservesPitch = true;
      current.playbackRate = typeof msg.speed === "number" && msg.speed > 0 ? msg.speed : 1;
      current.play().catch(() => {});
    } catch (_) {
      /* ignore playback errors — failure is surfaced via the TTS request path */
    }
  }
});
