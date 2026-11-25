const MEDIA_EXT = /\.(mp4|webm|m3u8|mpd)(\?|$)/i;
let writeQueue = Promise.resolve();

function getSize(headers = []) {
  for (const h of headers) {
    const name = h.name.toLowerCase();
    if (name === "content-range" && h.value) {
      const match = h.value.match(/\/(\d+)$/);
      if (match) return Number(match[1]);
    }
    if (name === "content-length" && h.value) {
      return Number(h.value);
    }
  }
  return 0;
}

function isMedia(details) {
  if (details.type === "media") return true;
  if (MEDIA_EXT.test(details.url)) return true;
  const ct = (details.responseHeaders || []).find(
    (h) => h.name.toLowerCase() === "content-type"
  )?.value?.toLowerCase() || "";
  return ct.startsWith("video/") || ct.includes("mpegurl") || ct.includes("dash+xml");
}

chrome.webRequest.onResponseStarted.addListener(
  (details) => {
    if (details.tabId < 0 || !isMedia(details)) return;

    const key = `tab_${details.tabId}`;
    const size = getSize(details.responseHeaders);

    writeQueue = writeQueue.then(async () => {
      const data = await chrome.storage.session.get(key);
      const list = data[key] || [];
      const existing = list.find((item) => item.url === details.url);

      if (!existing) {
        list.push({ url: details.url, size });
      } else if (size > existing.size) {
        existing.size = size;
      } else {
        return;
      }

      await chrome.storage.session.set({ [key]: list });
      chrome.action.setBadgeText({ tabId: details.tabId, text: String(list.length) });
      chrome.action.setBadgeBackgroundColor({ tabId: details.tabId, color: "#d93025" });
    });
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    chrome.storage.session.remove(`tab_${tabId}`);
    chrome.action.setBadgeText({ tabId, text: "" });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`tab_${tabId}`);
});
