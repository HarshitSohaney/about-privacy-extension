// Function to parse the robots.txt file and extract rules for a specific user agent
function parseRobotsTxt(robotsTxt, userAgent) {
  const lines = robotsTxt.split("\n");
  let currentUserAgent = "";
  let rules = {
    "*": { disallow: [], allow: [] },
    [userAgent]: { disallow: [], allow: [] },
  };

  // Loop through each line in the robots.txt file
  for (let line of lines) {
    line = line.trim().toLowerCase();

    // Identify and set the current User-Agent block
    if (line.startsWith("user-agent:")) {
      currentUserAgent = line.split(":")[1].trim();
    }
    // Add disallow rules if the current userAgent matches or is a wildcard
    else if (
      line.startsWith("disallow:") &&
      (currentUserAgent === "*" || currentUserAgent === userAgent)
    ) {
      const path = line.split(":")[1].trim();
      rules[currentUserAgent].disallow.push(path);
    }
    // Add allow rules if the current userAgent matches or is a wildcard
    else if (
      line.startsWith("allow:") &&
      (currentUserAgent === "*" || currentUserAgent === userAgent)
    ) {
      const path = line.split(":")[1].trim();
      rules[currentUserAgent].allow.push(path);
    }
  }

  // Check if access is completely allowed, blocked, or partially blocked
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

  // Return an object with parsed results
  return {
    completelyAllowed,
    completelyBlocked,
    partiallyBlocked,
    specificRules: rules[userAgent],
    wildcardRules: rules["*"],
  };
}

// Function to inject a script that checks if the website respects Global Privacy Control (GPC)
function checkGPCStatus() {
  return new Promise((resolve) => {
    // Create a <script> element that loads the external GPC checker script
    const script = document.createElement("script");
    script.src = browser.runtime.getURL("scripts/gpc-checker.js");
    (document.head || document.documentElement).appendChild(script);

    // Listen for a message event to receive the GPC status
    window.addEventListener("message", (event) => {
      // Ensure the message comes from the same window and has GPC status data
      if (event.source !== window || event.data.gpcStatus === undefined) return;
      resolve(event.data.gpcStatus); // Resolve the promise with the GPC status
    });

    // Clean up the script element after it has loaded
    script.onload = () => script.remove();
  });
}

// Listener for messages sent to the background script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle "checkRobotsTxt" action
  if (request.action === "checkRobotsTxt") {
    const domain = window.location.hostname;
    const protocol = window.location.protocol;

    // Construct the robots.txt URL
    const robotsTxtUrl = `${protocol}//${domain}/robots.txt`;

    // Fetch bot configuration from the local config.json file
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
          // If robots.txt was successfully fetched, parse and send results
          if (robotsTxtResponse.success) {
            const results = {};
            // Parse robots.txt for each bot user agent defined in the config
            config.bots.forEach((bot) => {
              results[bot.name] = parseRobotsTxt(
                robotsTxtResponse.data,
                bot.userAgent
              );
            });

            // Send results, including GPC status, back to the background script
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
            // If robots.txt could not be fetched, send an error message
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
