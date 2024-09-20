(function () {
  const gpcStatus =
    typeof navigator.globalPrivacyControl !== "undefined"
      ? navigator.globalPrivacyControl
      : "not_supported";

  // Send the result back to the content script via window.postMessage
  window.postMessage({ gpcStatus: gpcStatus }, "*");
})();
