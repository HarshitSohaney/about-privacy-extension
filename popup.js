function displayBotResults(botName, result) {
  let status;
  if (result.completelyAllowed) {
    status = `<span class="status allowed">Allowed</span>`;
  } else if (result.completelyBlocked) {
    status = `<span class="status blocked">Blocked</span>`;
  } else if (result.partiallyBlocked) {
    status = `<span class="status partially">Partially blocked</span>`;
  } else {
    status = `<span class="status allowed">Allowed</span>`;
  }

  let specificRulesHtml = '';
  if (result.specificRules.disallow.length > 0 || result.specificRules.allow.length > 0) {
    specificRulesHtml += '<h4>Specific rules:</h4><ul>';
    result.specificRules.allow.forEach(rule => specificRulesHtml += `<li>Allow: ${rule}</li>`);
    result.specificRules.disallow.forEach(rule => specificRulesHtml += `<li>Disallow: ${rule}</li>`);
    specificRulesHtml += '</ul>';
  }

  let wildcardRulesHtml = '';
  if (result.wildcardRules.disallow.length > 0 || result.wildcardRules.allow.length > 0) {
    wildcardRulesHtml += '<h4>Wildcard rules:</h4><ul>';
    result.wildcardRules.allow.forEach(rule => wildcardRulesHtml += `<li>Allow: ${rule}</li>`);
    result.wildcardRules.disallow.forEach(rule => wildcardRulesHtml += `<li>Disallow: ${rule}</li>`);
    wildcardRulesHtml += '</ul>';
  }

  return `
    <div class="result">
      <h3>${botName} scraper: ${status}</h3>
      <div class="rules">
        ${specificRulesHtml}
        ${wildcardRulesHtml ? `
          <div class="wildcard-toggle">Show Wildcard Rules ▼</div>
          <div class="wildcard-rules">
            ${wildcardRulesHtml}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function toggleWildcardRules(event) {
  const wildcardRules = event.target.nextElementSibling;
  const isExpanded = wildcardRules.classList.toggle('expanded');
  event.target.textContent = isExpanded ? 'Hide Wildcard Rules ▲' : 'Show Wildcard Rules ▼';
}

document.addEventListener('DOMContentLoaded', () => {
  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    browser.tabs.sendMessage(tabs[0].id, { action: "checkRobotsTxt" });
  });
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "displayResults") {
    const resultsDiv = document.getElementById('results');
    const robotsTxtPre = document.getElementById('robotsTxt');

    if (request.data.error) {
      resultsDiv.innerHTML = `<p>Error: ${request.data.error}</p>`;
    } else {
      resultsDiv.innerHTML = Object.entries(request.data.results)
        .map(([botName, result]) => displayBotResults(botName, result))
        .join('');
      robotsTxtPre.textContent = request.data.robotsTxt;

      // Add event listeners to wildcard toggles
      document.querySelectorAll('.wildcard-toggle').forEach(toggle => {
        toggle.addEventListener('click', toggleWildcardRules);
      });
    }
  }
});