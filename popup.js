function formatBytes(bytes) {
  if (!bytes) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(1)} ${units[i]}`;
}

function getFileName(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts.pop() || url;
  } catch {
    return url;
  }
}

async function render() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const key = `tab_${tab.id}`;
  const data = await chrome.storage.session.get(key);
  const items = (data[key] || []).sort((a, b) => b.size - a.size);
  const container = document.getElementById("list");

  document.getElementById("clear").onclick = async () => {
    await chrome.storage.session.remove(key);
    chrome.action.setBadgeText({ tabId: tab.id, text: "" });
    render();
  };

  if (!items.length) {
    container.innerHTML = `<div class="empty">No media captured yet. Hit play on the video.</div>`;
    return;
  }

  container.innerHTML = "";
  for (const item of items) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="name"></div>
      <div class="meta">${formatBytes(item.size)}</div>
      <div class="btns">
        <button class="dl">Download</button>
        <button class="open">Open</button>
        <button class="copy">Copy URL</button>
      </div>
    `;
    el.querySelector(".name").textContent = getFileName(item.url);
    el.querySelector(".dl").onclick = () => chrome.downloads.download({ url: item.url });
    el.querySelector(".open").onclick = () => chrome.tabs.create({ url: item.url });
    el.querySelector(".copy").onclick = (e) => {
      navigator.clipboard.writeText(item.url);
      e.target.textContent = "Copied";
      setTimeout(() => (e.target.textContent = "Copy URL"), 1000);
    };
    container.appendChild(el);
  }
}

render();
