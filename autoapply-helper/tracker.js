let allApps = [];
let currentFilter = 'all';
let currentApp = null;

document.addEventListener('DOMContentLoaded', () => {
  loadAndDisplayJobs();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('searchBox').addEventListener('input', filterJobs);
  
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      filterJobs();
    });
  });
  
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('detailModal').style.display = 'none';
  });
  
  document.getElementById('saveModalBtn').addEventListener('click', saveModalChanges);
  const scanBtn = document.getElementById('scanRejectionsBtn');
  if (scanBtn) {
    scanBtn.addEventListener('click', scanForRejections);
  }
}

async function loadAndDisplayJobs() {
  const data = await chrome.storage.sync.get('jobApplications');
  allApps = data.jobApplications || [];
  
  updateMetrics();
  displayJobs(allApps);
}

function updateMetrics() {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  document.getElementById('totalApps').textContent = allApps.length;
  document.getElementById('last7Days').textContent = allApps.filter(a => 
    new Date(a.appliedAt).getTime() > sevenDaysAgo
  ).length;
  document.getElementById('interviewCount').textContent = allApps.filter(a => 
    a.status === 'INTERVIEW' || a.status === 'ADVANCING'
  ).length;
  document.getElementById('offerCount').textContent = allApps.filter(a => 
    a.status === 'OFFER'
  ).length;
}

function filterJobs() {
  const searchTerm = document.getElementById('searchBox').value.toLowerCase();
  
  let filtered = allApps;
  
  if (currentFilter !== 'all') {
    filtered = filtered.filter(a => a.status === currentFilter);
  }
  
  if (searchTerm) {
    filtered = filtered.filter(a => 
      a.company.toLowerCase().includes(searchTerm) ||
      a.jobTitle.toLowerCase().includes(searchTerm)
    );
  }
  
  displayJobs(filtered);
}

function displayJobs(jobs) {
  const container = document.getElementById('jobsList');
  
  if (jobs.length === 0) {
    container.innerHTML = '<div class="empty-state">No applications found</div>';
    return;
  }
  
  container.innerHTML = jobs.map(app => {
    const stalled = isStalled(app);
    const salaryLine = app.salaryExpectation ? `Est: ${app.salaryExpectation}${app.salaryLocation ? ` (${app.salaryLocation})` : ''}` : '';
    const remoteLine = app.remotePreference || '';
    const followUpLine = app.followUpDone ? 'Follow-up done' : (app.followUpDue ? `Follow-up by ${formatDate(app.followUpDue)}` : '');
    return `
    <div class="job-card" data-id="${app.id}">
      <div class="job-card-header">
        <div>
          <div class="job-company">${app.company}</div>
          <div class="job-title">${app.jobTitle}</div>
        </div>
        <div class="status-group">
          ${stalled ? '<span class="status-pill status-pill--stalled">Stalled</span>' : ''}
          <span class="status-pill status-pill--${app.status.toLowerCase()}">${app.status}</span>
        </div>
      </div>
      <div class="job-card-meta">
        <span>Source: ${app.source || 'Direct'}</span>
        <span>Applied: ${formatDate(app.appliedAt)}</span>
        ${salaryLine ? `<span>${salaryLine}</span>` : ''}
        ${remoteLine ? `<span>${remoteLine}</span>` : ''}
        ${followUpLine ? `<span>${followUpLine}</span>` : ''}
      </div>
    </div>
  `;
  }).join('');
  
  container.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', () => openJobDetail(card.dataset.id));
  });
}

function openJobDetail(id) {
  currentApp = allApps.find(a => a.id === id);
  if (!currentApp) return;
  
  document.getElementById('modalTitle').textContent = `${currentApp.jobTitle} at ${currentApp.company}`;
  
  const statusSelect = document.getElementById('modalStatus');
  statusSelect.innerHTML = ['PENDING', 'APPLIED', 'REVIEWING', 'INTERVIEW', 'ADVANCING', 'REJECTED', 'OFFER', 'CLOSED']
    .map(s => `<option value="${s}" ${s === currentApp.status ? 'selected' : ''}>${s}</option>`)
    .join('');
  
  const urlLink = document.getElementById('modalUrl');
  if (currentApp.url) {
    urlLink.href = currentApp.url;
    urlLink.textContent = currentApp.url;
    urlLink.style.display = 'block';
  } else {
    urlLink.style.display = 'none';
  }

  document.getElementById('modalNotes').value = currentApp.notes || '';
  const localNotesEl = document.getElementById('modalLocalNotes');
  if (localNotesEl) {
    localNotesEl.value = currentApp.localNotes || '';
  }
  const followUpCheckbox = document.getElementById('modalFollowUpDone');
  if (followUpCheckbox) {
    followUpCheckbox.checked = Boolean(currentApp.followUpDone);
  }
  document.getElementById('detailModal').style.display = 'flex';
}

async function saveModalChanges() {
  if (!currentApp) return;
  
  currentApp.status = document.getElementById('modalStatus').value;
  currentApp.notes = document.getElementById('modalNotes').value;
  const followUpCheckbox = document.getElementById('modalFollowUpDone');
   if (followUpCheckbox) {
     currentApp.followUpDone = followUpCheckbox.checked;
   }
  const localNotesEl = document.getElementById('modalLocalNotes');
  if (localNotesEl) {
    currentApp.localNotes = localNotesEl.value;
  }
  currentApp.lastStatusUpdate = new Date().toISOString();
  
  await chrome.storage.sync.set({ jobApplications: allApps });
  
  document.getElementById('detailModal').style.display = 'none';
  loadAndDisplayJobs();
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
}

function isStalled(app) {
  const closedStatuses = ['REJECTED', 'OFFER', 'CLOSED'];
  if (closedStatuses.includes(app.status)) return false;
  const applied = app.appliedAt ? new Date(app.appliedAt).getTime() : 0;
  const now = Date.now();
  const diffDays = (now - applied) / (1000 * 60 * 60 * 24);
  return diffDays > 14;
}

async function scanForRejections() {
  const keywords = ['unfortunately', 'regret to inform', 'not moving forward', 'rejection', 'decline', 'not selected'];
  let updates = 0;
  allApps.forEach(app => {
    const text = `${app.notes || ''} ${app.localNotes || ''}`.toLowerCase();
    if (keywords.some(k => text.includes(k))) {
      if (app.status !== 'REJECTED') {
        app.status = 'REJECTED';
        app.lastStatusUpdate = new Date().toISOString();
        updates++;
      }
    }
  });
  if (updates > 0) {
    await chrome.storage.sync.set({ jobApplications: allApps });
    loadAndDisplayJobs();
  }
}
