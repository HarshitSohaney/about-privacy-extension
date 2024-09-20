function fetchRobotsTxt(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((response) => response.text())
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs.sendMessage(tab.id, { action: "checkRobotsTxt" });
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchRobotsTxt") {
    fetchRobotsTxt(request.url)
      .then((data) => {
        sendResponse({ success: true, data: data });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error });
      });
    return true;
  }
});
