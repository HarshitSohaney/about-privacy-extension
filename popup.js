// Helper functions
const createStatusElement = (status) => `<span class="status ${status.toLowerCase()}">${status}</span>`;

const createRulesList = (rules, type) => {
  if (rules.length === 0) return '';
  return `
    <h4>${type} rules:</h4>
    <ul>
      ${rules.map(rule => `<li>${rule.type}: ${rule.value}</li>`).join('')}
    </ul>
  `;
};

const createWildcardToggle = (wildcardRulesHtml) => `
  <div class="wildcard-toggle">Show Wildcard Rules ▼</div>
  <div class="wildcard-rules">
    ${wildcardRulesHtml}
  </div>
`;

// Main functions
function displayBotResults(botName, result) {
  const getStatus = () => {
    if (result.completelyAllowed) return 'Allowed';
    if (result.completelyBlocked) return 'Blocked';
    if (result.partiallyBlocked) return 'Partially blocked';
    return 'Allowed';
  };

  const status = createStatusElement(getStatus());
  const specificRulesHtml = createRulesList([
    ...result.specificRules.allow.map(rule => ({ type: 'Allow', value: rule })),
    ...result.specificRules.disallow.map(rule => ({ type: 'Disallow', value: rule }))
  ], 'Specific');

  const wildcardRulesHtml = createRulesList([
    ...result.wildcardRules.allow.map(rule => ({ type: 'Allow', value: rule })),
    ...result.wildcardRules.disallow.map(rule => ({ type: 'Disallow', value: rule }))
  ], 'Wildcard');

  return `
    <div class="result">
      <h3>${botName} scraper: ${status}</h3>
      <div class="rules">
        ${specificRulesHtml}
        ${wildcardRulesHtml ? createWildcardToggle(wildcardRulesHtml) : ''}
      </div>
    </div>
  `;
}

function toggleWildcardRules(event) {
  const wildcardRules = event.target.nextElementSibling;
  const isExpanded = wildcardRules.classList.toggle('expanded');
  event.target.textContent = isExpanded ? 'Hide Wildcard Rules ▲' : 'Show Wildcard Rules ▼';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  browser.tabs.query({ active: true, currentWindow: true })
    .then(tabs => browser.tabs.sendMessage(tabs[0].id, { action: "checkRobotsTxt" }))
    .catch(error => console.error('Error querying tabs:', error));
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "displayResults") return;

  const resultsDiv = document.getElementById('results');
  const robotsTxtPre = document.getElementById('robotsTxt');

  if (request.data.error) {
    resultsDiv.innerHTML = `<p>Error: ${request.data.error}</p>`;
    return;
  }

  resultsDiv.innerHTML = Object.entries(request.data.results)
    .map(([botName, result]) => displayBotResults(botName, result))
    .join('');

  robotsTxtPre.textContent = request.data.robotsTxt;

  document.querySelectorAll('.wildcard-toggle').forEach(toggle => {
    toggle.addEventListener('click', toggleWildcardRules);
  });
});