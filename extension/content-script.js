chrome.runtime.onMessage.addListener(function (msg) {
  if (msg.action === 'log') {
    console.log('[Network Overrides]', ...msg.parameters);
  }
});
