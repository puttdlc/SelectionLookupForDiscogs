let tooltip = null;
let loader = null;

const style = document.createElement("style");
style.textContent = `
  .dqp-tooltip {
    position: fixed;
    z-index: 9999;
    background: #1a1a1a;
    color: #f0f0f0;
    border: 1px solid #444;
    border-radius: 10px;
    padding: 12px;
    width: 200px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    font-family: sans-serif;
    font-size: 14px;
    cursor: default;
    opacity: 0;
    transform: scale(0.95);
    transition: opacity 0.15s ease, transform 0.2s ease, width 0.2s ease, box-shadow 0.2s ease;
  }
  .dqp-tooltip.visible {
    opacity: 1;
    transform: scale(1);
  }
  .dqp-tooltip:hover {
    width: 240px;
    box-shadow: 0 6px 28px rgba(0,0,0,0.65);
  }
  .dqp-tooltip.fading {
    opacity: 0;
    transform: scale(0.95);
    pointer-events: none;
  }
  .dqp-tooltip img {
    width: 100%;
    border-radius: 6px;
    display: block;
    margin-bottom: 8px;
  }
  .dqp-tooltip .dqp-title {
    font-weight: bold;
  }
  .dqp-tooltip .dqp-year {
    color: #aaa;
    margin-top: 2px;
  }
  .dqp-tooltip a {
    display: block;
    margin-top: 8px;
    color: #4a9eff;
    text-decoration: none;
    font-size: 13px;
  }
  .dqp-loader {
    position: fixed;
    z-index: 9999;
    width: 32px;
    height: 32px;
    background: #1a1a1a;
    border: 1px solid #444;
    border-radius: 50%;
    box-shadow: 0 2px 12px rgba(0,0,0,0.4);
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
  }
  .dqp-loader.visible {
    opacity: 1;
  }
  .dqp-loader::after {
    content: "";
    position: absolute;
    inset: 6px;
    border: 2px solid #444;
    border-top-color: #f3a125;
    border-radius: 50%;
    animation: dqp-spin 0.7s linear infinite;
  }
  @keyframes dqp-spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

function showLoader(x, y) {
  removeLoader();
  loader = document.createElement("div");
  loader.className = "dqp-loader";
  loader.style.left = `${x + 12}px`;
  loader.style.top = `${y + 12}px`;
  document.body.appendChild(loader);
  requestAnimationFrame(() => loader?.classList.add("visible"));
}

function removeLoader() {
  if (!loader) return;
  const el = loader;
  el.classList.remove("visible");
  el.addEventListener("transitionend", () => el.remove(), { once: true });
  loader = null;
}

function removeTooltip() {
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
}

function fadeOut() {
  removeLoader();
  if (!tooltip) return;
  const el = tooltip;
  el.classList.add("fading");
  el.addEventListener("transitionend", () => el.remove(), { once: true });
  tooltip = null;
}

function showTooltip(data, x, y) {
  removeTooltip();

  tooltip = document.createElement("div");
  tooltip.className = "dqp-tooltip";

  const img = document.createElement("img");
  img.src = data.coverThumb;
  tooltip.appendChild(img);

  const title = document.createElement("div");
  title.className = "dqp-title";
  title.textContent = data.title;
  tooltip.appendChild(title);

  if (data.year) {
    const year = document.createElement("div");
    year.className = "dqp-year";
    year.textContent = data.year;
    tooltip.appendChild(year);
  }

  const link = document.createElement("a");
  link.href = data.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "View on Discogs →";
  tooltip.appendChild(link);

  document.body.appendChild(tooltip);

  const rect = tooltip.getBoundingClientRect();
  let left = x + 12;
  let top = y + 12;
  if (left + rect.width > window.innerWidth) left = x - rect.width - 12;
  if (top + rect.height > window.innerHeight) top = y - rect.height - 12;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;

  requestAnimationFrame(() => tooltip?.classList.add("visible"));
}

let lastRightClickPos = { x: 0, y: 0 };

function performLookup(query, x, y) {
  removeTooltip();
  showLoader(x, y);
  chrome.runtime.sendMessage({ type: "LOOKUP", query }, (response) => {
    removeLoader();
    if (chrome.runtime.lastError || !response?.ok) return;
    showTooltip(response.data, x, y);
  });
}

document.addEventListener("contextmenu", (e) => {
  lastRightClickPos = { x: e.clientX, y: e.clientY };
});

document.addEventListener("mouseup", (e) => {
  const selectedText = window.getSelection().toString().trim();
  if (!selectedText) {
    removeTooltip();
    return;
  }

  chrome.storage.sync.get("instantLookup", ({ instantLookup }) => {
    if (instantLookup) performLookup(selectedText, e.clientX, e.clientY);
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "CONTEXT_LOOKUP") {
    performLookup(message.query, lastRightClickPos.x, lastRightClickPos.y);
  }
});

document.addEventListener("mousedown", (e) => {
  if (tooltip && !tooltip.contains(e.target)) removeTooltip();
});

window.addEventListener("scroll", fadeOut, { capture: true, passive: true });
