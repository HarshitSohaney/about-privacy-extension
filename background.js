function fetchWellKnownResource(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((response) => {
        if (response.status === 404) {
          resolve(null);
        } else {
          return response.text();
        }
      })
      .then((data) => {
        if (data !== null) {
          resolve(data);
        }
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
  if (request.action === "fetchWellKnownResource") {
    fetchWellKnownResource(request.url)
      .then((data) => {
        sendResponse({ success: true, data: data });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error });
      });
    return true;
  }
});
