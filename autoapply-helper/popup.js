document.addEventListener('DOMContentLoaded', () => {
  const prefillBtn = document.getElementById('prefillBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const openTrackerBtn = document.getElementById('openTrackerBtn');

  prefillBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { type: 'PREFILL_FORM' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Content script not ready, will auto-load on page');
      }
    });
  });

  if (openTrackerBtn) {
    openTrackerBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'tracker.html' });
    });
  }

  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
