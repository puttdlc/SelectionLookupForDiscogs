const DEFAULT_INSTANT_LOOKUP = false;

const tokenInput = document.getElementById("tokenInput");
const saveBtn = document.getElementById("saveBtn");
const status = document.getElementById("status");
const toggleBtn = document.getElementById("toggleVisibility");
const instantToggle = document.getElementById("instantToggle");

chrome.storage.sync.get(["token", "instantLookup"], ({ token, instantLookup }) => {
  if (token) tokenInput.value = token;
  instantToggle.checked = instantLookup ?? DEFAULT_INSTANT_LOOKUP;
});

function loadIcon(elementId, fileName) {
  fetch(chrome.runtime.getURL(`svg/${fileName}`))
    .then((res) => res.text())
    .then((svg) => {
      document.getElementById(elementId).innerHTML = svg;
    });
}

loadIcon("lockIcon", "lock.svg");
loadIcon("eyeIcon", "eye.svg");

let visible = false;
toggleBtn.addEventListener("click", () => {
  visible = !visible;
  tokenInput.type = visible ? "text" : "password";
  loadIcon("eyeIcon", visible ? "eye-off.svg" : "eye.svg");
});

instantToggle.addEventListener("change", () => {
  chrome.storage.sync.set({ instantLookup: instantToggle.checked });
});

saveBtn.addEventListener("click", () => {
  const token = tokenInput.value.trim();

  if (!token) {
    showStatus("Please enter a token.", "error");
    return;
  }

  chrome.storage.sync.set({ token }, () => {
    showStatus("Token saved! Reload any open tabs for the extension to activate.", "success");
    setTimeout(() => {
      status.textContent = "";
      status.className = "";
    }, 5000);
  });
});

function showStatus(msg, type) {
  status.textContent = "";
  status.className = "";
  setTimeout(() => {
    status.textContent = msg;
    status.className = type;
  }, 10);
}
