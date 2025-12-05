document.addEventListener('DOMContentLoaded', () => {
  const prefillBtn = document.getElementById('prefillBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const openTrackerBtn = document.getElementById('openTrackerBtn');
  const startMassApplyBtn = document.getElementById('startMassApplyBtn');
  let cachedProfile = null;

  chrome.storage.sync.get('profile', (data) => {
    cachedProfile = data.profile || null;
  });

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

  document.querySelectorAll('[data-copy-snippet]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-copy-snippet');
      const label = btn.getAttribute('data-label') || 'Snippet';
      if (!cachedProfile) return;
      const text = cachedProfile[key] || '';
      if (!text) return;
      navigator.clipboard?.writeText(text).catch(() => {});
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = label, 1200);
    });
  });

  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  if (startMassApplyBtn) {
    startMassApplyBtn.addEventListener('click', async () => {
      const profile = cachedProfile || (await chrome.storage.sync.get('profile')).profile;
      const queue = profile?.jobQueue || [];
      if (!queue.length) return;
      let delay = 0;
      const step = 1200;
      queue.forEach(item => {
        setTimeout(() => {
          chrome.tabs.create({ url: item.url }, (tab) => {
            // Hint to content script for later: set target role/company for this tab
            if (tab?.id) {
              chrome.tabs.sendMessage(tab.id, { type: 'SET_TARGET', targetRole: item.title, targetCompany: item.company });
            }
          });
        }, delay);
        delay += step;
      });
    });
  }
});
