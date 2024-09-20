const createStatusElement = (status) =>
  `<span>${
    status == "Partial" ? "!" : status == "Blocked" ? "Blocked" : "Allowed"
  }</span>`;

const createRulesList = (rules, type) => {
  if (rules.length === 0) return "";
  return `
    <h4>${type} rules:</h4>
    <ul>
      ${rules.map((rule) => `<li>${rule.type}: ${rule.value}</li>`).join("")}
    </ul>
  `;
};

const createWildcardToggle = (wildcardRulesHtml) => `
  <div class="wildcard-toggle">Show Wildcard Rules ▼</div>
  <div class="wildcard-rules">
    ${wildcardRulesHtml}
  </div>
`;

const getBotImagePath = (botName) => {
  return `/assets/${botName.toLowerCase().replace(" ", "-")}.png`;
};

// Main functions
function displayBotResults(botName, result) {
  const getStatus = () => {
    if (result.completelyAllowed) return "Allowed";
    if (result.completelyBlocked) return "Blocked";
    if (result.partiallyBlocked) return "Partial";
    return "Allowed";
  };

  const status_string = getStatus();
  const status = createStatusElement(status_string);
  const specificRulesHtml = createRulesList(
    [
      ...result.specificRules.allow.map((rule) => ({
        type: "Allow",
        value: rule,
      })),
      ...result.specificRules.disallow.map((rule) => ({
        type: "Disallow",
        value: rule,
      })),
    ],
    "Specific"
  );

  const wildcardRulesHtml = createRulesList(
    [
      ...result.wildcardRules.allow.map((rule) => ({
        type: "Allow",
        value: rule,
      })),
      ...result.wildcardRules.disallow.map((rule) => ({
        type: "Disallow",
        value: rule,
      })),
    ],
    "Wildcard"
  );

  const botImagePath = getBotImagePath(botName);

  return `
    <div class="result-card">
      <div class="bot-header">
        <img src="${botImagePath}" alt="${botName} logo" class="bot-image">
        <div class="status-container ${status_string.toLocaleLowerCase()}">
          ${status}
        </div>
      </div>
      ${
        status_string == "Partial"
          ? `<div class="rules">
      ${specificRulesHtml}
      ${wildcardRulesHtml ? createWildcardToggle(wildcardRulesHtml) : ""}
    </div>`
          : ""
      }
    </div>
  `;
}

function toggleWildcardRules(event) {
  const wildcardRules = event.target
    .closest(".result-card")
    .querySelector(".wildcard-rules");
  const isExpanded = wildcardRules.classList.toggle("expanded");
  event.target.textContent = isExpanded
    ? "Hide Wildcard Rules ▲"
    : "Show Wildcard Rules ▼";
}

function addWellKnownSiteLink(domain) {
  const wellKnownLink = document.getElementById("wellKnownLink");
  console.log(domain);
  wellKnownLink.href = `https://well-known.dev/sites/${domain}`;
}

function updateGPCstatus(status) {
  const gpcStatus = document.getElementById("gpc-status");
  if (status == true) {
    gpcStatus.innerHTML = "<span>GPC Enabled 😊</span>";
  } else if (status == false) {
    gpcStatus.innerHTML = "<span>GPC Disabled 🤨</span>";
  } else {
    gpcStatus.innerHTML = "<span>GPC Not Supported 😔</span>";
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  browser.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) =>
      browser.tabs.sendMessage(tabs[0].id, { action: "checkRobotsTxt" })
    )
    .catch((error) => console.error("Error querying tabs:", error));
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "displayResults") return;

  const resultsDiv = document.getElementById("results");
  const robotsTxtPre = document.getElementById("robotsTxt");

  if (request.data.error) {
    resultsDiv.innerHTML = `<p>Error: ${request.data.error}</p>`;
    return;
  }

  addWellKnownSiteLink(request.data.hostname);

  updateGPCstatus(request.data.respects_gpc);

  resultsDiv.innerHTML = `
    <div class="results-grid">
      ${Object.entries(request.data.results)
        .map(([botName, result]) => displayBotResults(botName, result))
        .join("")}
    </div>
  `;

  robotsTxtPre.textContent = request.data.robotsTxt;

  document.querySelectorAll(".wildcard-toggle").forEach((toggle) => {
    toggle.addEventListener("click", toggleWildcardRules);
  });
});
