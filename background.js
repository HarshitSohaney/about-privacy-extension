browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs.sendMessage(tab.id, { action: "checkRobotsTxt" });
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchRobotsTxt") {
    fetch(request.url)
      .then((response) => response.text())
      .then((data) => {
        sendResponse({ success: true, data: data });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.toString() });
      });
    return true; // Indicates we will send a response asynchronously
  }
});
