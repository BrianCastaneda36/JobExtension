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
  
  container.innerHTML = jobs.map(app => `
    <div class="job-card" data-id="${app.id}">
      <div class="job-card-header">
        <div>
          <div class="job-company">${app.company}</div>
          <div class="job-title">${app.jobTitle}</div>
        </div>
        <span class="status-pill status-pill--${app.status.toLowerCase()}">${app.status}</span>
      </div>
      <div class="job-card-meta">
        <span>📍 ${app.source}</span>
        <span>📅 ${formatDate(app.appliedAt)}</span>
      </div>
    </div>
  `).join('');
  
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
  document.getElementById('detailModal').style.display = 'flex';
}

async function saveModalChanges() {
  if (!currentApp) return;
  
  currentApp.status = document.getElementById('modalStatus').value;
  currentApp.notes = document.getElementById('modalNotes').value;
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
