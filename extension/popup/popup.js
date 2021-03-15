const refreshButton = document.getElementById('refresh-button');

refreshButton.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'refresh' });
});
