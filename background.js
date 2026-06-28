chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "discogs-lookup",
    title: 'Search Discogs for "%s"',
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "discogs-lookup" && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      type: "CONTEXT_LOOKUP",
      query: info.selectionText.trim()
    });
  }
});

async function getAlbumCover(query, token) {
  if (!token) throw new Error("No Discogs token set. Open the extension popup to add one.");

  const searchRes = await fetch(
    `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release&token=${token}`
  );
  if (!searchRes.ok) throw new Error(`Discogs API error: ${searchRes.status}`);
  const searchData = await searchRes.json();

  if (!searchData.results?.length) throw new Error("No results found for: " + query);

  const firstResult = searchData.results[0];

  const releaseRes = await fetch(
    `https://api.discogs.com/releases/${firstResult.id}?token=${token}`
  );
  const releaseData = await releaseRes.json();

  return {
    title: firstResult.title,
    year: firstResult.year,
    coverThumb: firstResult.cover_image,
    coverFull: releaseData.images?.[0]?.uri ?? firstResult.cover_image,
    url: `https://www.discogs.com${firstResult.uri}`
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOOKUP") {
    (async () => {
      try {
        const { token } = await chrome.storage.sync.get("token");
        const result = await getAlbumCover(message.query, token);
        sendResponse({ ok: true, data: result });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }
});