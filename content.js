function parseRobotsTxt(robotsTxt, userAgent) {
  const lines = robotsTxt.split("\n");
  let currentUserAgent = "";
  let rules = {
    "*": { disallow: [], allow: [] },
    [userAgent]: { disallow: [], allow: [] },
  };

  for (let line of lines) {
    line = line.trim().toLowerCase();
    if (line.startsWith("user-agent:")) {
      currentUserAgent = line.split(":")[1].trim();
    } else if (
      line.startsWith("disallow:") &&
      (currentUserAgent === "*" || currentUserAgent === userAgent)
    ) {
      const path = line.split(":")[1].trim();
      rules[currentUserAgent].disallow.push(path);
    } else if (
      line.startsWith("allow:") &&
      (currentUserAgent === "*" || currentUserAgent === userAgent)
    ) {
      const path = line.split(":")[1].trim();
      rules[currentUserAgent].allow.push(path);
    }
  }

  const completelyAllowed =
    rules[userAgent].allow.includes("/") || rules["*"].allow.includes("/");
  const completelyBlocked =
    !completelyAllowed &&
    (rules[userAgent].disallow.includes("/") ||
      rules["*"].disallow.includes("/"));
  const partiallyBlocked =
    !completelyAllowed &&
    !completelyBlocked &&
    (rules[userAgent].disallow.length > 0 || rules["*"].disallow.length > 0);

  return {
    completelyAllowed,
    completelyBlocked,
    partiallyBlocked,
    specificRules: rules[userAgent],
    wildcardRules: rules["*"],
  };
}

// Function to inject a script to check for GPC in the website context
function checkGPCStatus() {
  return new Promise((resolve) => {
    // Create a <script> tag that points to the external script
    const script = document.createElement("script");
    script.src = browser.runtime.getURL("scripts/gpc-checker.js"); // Path to the external script
    (document.head || document.documentElement).appendChild(script);

    // Listen for the GPC status response
    window.addEventListener("message", (event) => {
      if (event.source !== window || event.data.gpcStatus === undefined) return;
      resolve(event.data.gpcStatus);
    });

    // Clean up the script after it executes
    script.onload = () => script.remove();
  });
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkRobotsTxt") {
    const domain = window.location.hostname;
    const protocol = window.location.protocol;
    const robotsTxtUrl = `${protocol}//${domain}/robots.txt`;

    fetch(browser.runtime.getURL("config.json"))
      .then((response) => response.json())
      .then((config) => {
        Promise.all([
          browser.runtime.sendMessage({
            action: "fetchRobotsTxt",
            url: robotsTxtUrl,
          }),
          checkGPCStatus(),
        ]).then(([robotsTxtResponse, gpcStatus]) => {
          if (robotsTxtResponse.success) {
            const results = {};
            config.bots.forEach((bot) => {
              results[bot.name] = parseRobotsTxt(
                robotsTxtResponse.data,
                bot.userAgent
              );
            });

            browser.runtime.sendMessage({
              action: "displayResults",
              data: {
                results: results,
                robotsTxt: robotsTxtResponse.data,
                hostname: domain,
                respects_gpc: gpcStatus,
              },
            });
          } else {
            browser.runtime.sendMessage({
              action: "displayResults",
              data: {
                error: "Failed to fetch robots.txt",
              },
            });
          }
        });
      });
  }
});
