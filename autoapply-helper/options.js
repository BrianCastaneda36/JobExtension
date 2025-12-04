const defaultProfile = {
  fullName: "Brian Adam Castaneda",
  email: "brian.adam.castaneda@gmail.com",
  phone: "+1 (727) 404-7175",
  location: "Tampa, FL (open to remote from Colombia and LATAM in US time zones)",
  linkedinUrl: "https://www.linkedin.com/in/brian-castaneda-405880170",
  portfolioUrl: "https://briancastaneda.dev",
  resumeUrl: "https://your-resume-link-here.com",
  username: "Brianc3986",
  password: "Emma3786!!",
  desiredTitle: "Software Engineer / Full Stack Engineer / Data Engineer",
  expectedSalaryYearly: "$105,000 - $135,000 USD (flexible based on level, scope, and benefits)",
  expectedSalaryHourly: "$55 - $70/hr USD (flexible based on project and duration)",
  workAuthorization: "US citizen, authorized to work for US employers. Open to fully remote roles while residing in Colombia, aligned to US Eastern time.",
  availability: "Currently employed; available to start within 2-3 weeks of offer. Open to discussing earlier or phased start if needed.",
  disabilityStatus: "I prefer not to say",
  veteranStatus: "I am not a protected veteran",
  googleClientId: "",
  grokApiKey: "",
  resumeSummary: "",
  aboutYou: "I'm a software engineer and data-focused product professional with a background in credit risk, analytics, and automation. I've shipped internal tools, dashboards, and integrations using Python, SQL, Alteryx, and JavaScript/TypeScript that reduce manual work and give teams clearer visibility into their metrics. I enjoy owning problems end-to-end: clarifying requirements with stakeholders, designing a simple architecture, and then implementing, testing, and iterating on real-world feedback. I'm comfortable working remotely, communicating async, and collaborating across product, engineering, and operations.",
  whyThisRoleTemplate: "I'm excited about the {role} opportunity at {company} because it sits right at the intersection of engineering, data, and real business impact. I enjoy working on products where better tooling, automation, and analytics directly improve user outcomes and company performance. From my experience building internal dashboards, Python tools, and backend integrations, I've seen how much leverage a strong engineering team can create, and I'm looking for a place where I can contribute hands-on, ship quickly, and grow with a remote-first, high-ownership culture like yours.",
  strengths: "My strengths are: (1) turning messy, real-world requirements into clear technical plans and small, shippable pieces; (2) building reliable tools and automation in Python, SQL, and JavaScript that reduce manual work and improve decision-making; and (3) communicating clearly with non-technical stakeholders so we're aligned on outcomes, trade-offs, and timelines. I'm comfortable working independently in a remote environment, asking the right questions early, and taking ownership of results instead of just tickets.",
  remotePreference: "Remote-first, ideally working core hours in US Eastern time. I'm comfortable collaborating asynchronously with distributed teams, and I value clear written communication, well-defined ownership, and a culture that trusts engineers to manage their time and deliver outcomes."
};

const fields = [
  'fullName', 'email', 'phone', 'location', 'linkedinUrl', 'portfolioUrl', 'username', 'password',
  'desiredTitle', 'expectedSalaryYearly', 'expectedSalaryHourly', 'availability',
  'workAuthorization', 'disabilityStatus', 'veteranStatus', 'googleClientId', 'grokApiKey', 'resumeSummary',
  'aboutYou', 'whyThisRoleTemplate', 'strengths', 'remotePreference'
];

const trackerState = {
  apps: [],
  filter: 'all'
};

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get('profile', (data) => {
    const profile = { ...defaultProfile, ...(data.profile || {}) };
    const needsBackfill = !data.profile || fields.some(f => typeof data.profile?.[f] === 'undefined');

    if (needsBackfill) {
      chrome.storage.sync.set({ profile });
    }
    
    fields.forEach(field => {
      const element = document.getElementById(field);
      if (element) element.value = profile[field] || '';
    });
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const profile = {};
    fields.forEach(field => {
      const element = document.getElementById(field);
      if (element) profile[field] = element.value;
    });

    chrome.storage.sync.set({ profile }, () => {
      const status = document.getElementById('saveStatus');
      const btn = document.getElementById('saveBtn');
      
      btn.textContent = '✓ Saved!';
      status.classList.add('show');
      
      setTimeout(() => {
        btn.textContent = '💾 Save profile';
        status.classList.remove('show');
      }, 2000);
    });
  });

  setupTrackerSection();
  setupGrokSection();
});

function setupTrackerSection() {
  const searchInput = document.getElementById('trackerSearch');
  const filterPills = document.querySelectorAll('#trackerFilters .filter-pill');
  const openTrackerBtn = document.getElementById('openTrackerBtn');

  if (searchInput) {
    searchInput.addEventListener('input', renderTrackerList);
  }

  if (filterPills.length) {
    filterPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        filterPills.forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        trackerState.filter = e.target.dataset.filter;
        renderTrackerList();
      });
    });
  }

  if (openTrackerBtn) {
    openTrackerBtn.addEventListener('click', () => {
      const url = chrome.runtime.getURL('tracker.html');
      window.open(url, '_blank');
    });
  }

  loadTrackerData();
}

function loadTrackerData() {
  chrome.storage.sync.get('jobApplications', (data) => {
    trackerState.apps = (data.jobApplications || []).slice().sort((a, b) => {
      return new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime();
    });
    updateTrackerMetrics();
    renderTrackerList();
  });
}

function renderTrackerList() {
  const container = document.getElementById('trackerList');
  if (!container) return;

  const searchTerm = (document.getElementById('trackerSearch')?.value || '').toLowerCase();
  let jobs = trackerState.apps;

  if (trackerState.filter !== 'all') {
    jobs = jobs.filter(a => a.status === trackerState.filter);
  }
  if (searchTerm) {
    jobs = jobs.filter(a => 
      (a.company || '').toLowerCase().includes(searchTerm) ||
      (a.jobTitle || '').toLowerCase().includes(searchTerm)
    );
  }

  const limited = jobs.slice(0, 12);

  if (limited.length === 0) {
    container.innerHTML = '<div class="empty-state">No applications logged yet.</div>';
    return;
  }

  container.innerHTML = limited.map(app => `
    <div class="job-card job-card--compact">
      <div class="job-card-header">
        <div>
          <div class="job-company">${escapeHtml(app.company || 'Unknown')}</div>
          <div class="job-title">${escapeHtml(app.jobTitle || '')}</div>
        </div>
        <span class="status-pill status-pill--${(app.status || 'applied').toLowerCase()}">${app.status || 'APPLIED'}</span>
      </div>
      <div class="job-card-meta">
        <span>Source: ${escapeHtml(app.source || 'Direct')}</span>
        <span>Applied: ${formatDate(app.appliedAt)}</span>
        ${app.salaryExpectation ? `<span>Salary: ${escapeHtml(app.salaryExpectation)}</span>` : ''}
        ${app.remotePreference ? `<span>${escapeHtml(app.remotePreference)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function updateTrackerMetrics() {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const total = trackerState.apps.length;
  const last7 = trackerState.apps.filter(a => new Date(a.appliedAt || 0).getTime() > sevenDaysAgo).length;
  const interviewing = trackerState.apps.filter(a => ['INTERVIEW', 'ADVANCING'].includes(a.status)).length;
  const offers = trackerState.apps.filter(a => a.status === 'OFFER').length;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('trackerTotal', total);
  setText('trackerLast7', last7);
  setText('trackerInterview', interviewing);
  setText('trackerOffer', offers);
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function setFieldValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value;
}

function setupGrokSection() {
  const btn = document.getElementById('generateGrokBtn');
  const status = document.getElementById('grokStatus');
  const extractBtn = document.getElementById('extractResumeBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    status.textContent = '';
    const apiKey = (document.getElementById('grokApiKey')?.value || '').trim();
    const targetRole = (document.getElementById('targetRole')?.value || '').trim();
    const targetCompany = (document.getElementById('targetCompany')?.value || '').trim();
    const jobDescription = (document.getElementById('jobDescription')?.value || '').trim();
    const resumeSummary = (document.getElementById('resumeSummary')?.value || '').trim();

    if (!apiKey) {
      status.textContent = 'Add your Grok API key first.';
      return;
    }
    if (!targetRole || !targetCompany) {
      status.textContent = 'Add target role and company.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Generating...';
    try {
      const profile = collectProfileFromForm();
      const drafted = await callGrokForAnswers({
        apiKey,
        targetRole,
        targetCompany,
        jobDescription,
        resumeSummary,
        profile
      });

      if (drafted.aboutYou) setFieldValue('aboutYou', drafted.aboutYou);
      if (drafted.whyThisRoleTemplate) setFieldValue('whyThisRoleTemplate', drafted.whyThisRoleTemplate);
      if (drafted.strengths) setFieldValue('strengths', drafted.strengths);
      if (drafted.remotePreference) setFieldValue('remotePreference', drafted.remotePreference);

      // Persist updated profile (including api key & resume summary)
      const updatedProfile = collectProfileFromForm();
      chrome.storage.sync.set({ profile: updatedProfile });

      status.textContent = 'Drafted and saved.';
    } catch (err) {
      console.error(err);
      status.textContent = 'Error: ' + (err.message || 'Failed to generate');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate tailored answers';
    }
  });

  if (extractBtn) {
    extractBtn.addEventListener('click', async () => {
      status.textContent = '';
      const apiKey = (document.getElementById('grokApiKey')?.value || '').trim();
      const file = document.getElementById('resumeFile')?.files?.[0];

      if (!apiKey) {
        status.textContent = 'Add your Grok API key first.';
        return;
      }
      if (!file) {
        status.textContent = 'Select a resume file.';
        return;
      }
      if (file.size > 2_500_000) {
        status.textContent = 'File too large (max ~2.5MB for extraction).';
        return;
      }

      extractBtn.disabled = true;
      extractBtn.textContent = 'Extracting...';
      try {
        const base64 = await readFileAsBase64(file);
        const extracted = await callGrokForResumeExtraction({
          apiKey,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Data: base64
        });

        if (extracted.resumeSummary) setFieldValue('resumeSummary', extracted.resumeSummary);
        if (extracted.aboutYou) setFieldValue('aboutYou', extracted.aboutYou);
        if (extracted.strengths) setFieldValue('strengths', extracted.strengths);
        if (extracted.remotePreference) setFieldValue('remotePreference', extracted.remotePreference);

        const updatedProfile = collectProfileFromForm();
        chrome.storage.sync.set({ profile: updatedProfile });

        status.textContent = 'Extracted from resume and saved.';
      } catch (err) {
        console.error(err);
        status.textContent = 'Error: ' + (err.message || 'Failed to extract');
      } finally {
        extractBtn.disabled = false;
        extractBtn.textContent = 'Extract from resume file';
      }
    });
  }
}

function collectProfileFromForm() {
  const profile = {};
  fields.forEach(field => {
    const el = document.getElementById(field);
    if (!el) return;
    if (el.type === 'password') {
      profile[field] = el.value || '';
    } else {
      profile[field] = el.value || '';
    }
  });
  return profile;
}

async function callGrokForAnswers({ apiKey, targetRole, targetCompany, jobDescription, resumeSummary, profile }) {
  const systemPrompt = `You draft concise, ATS-friendly application answers that stay truthful to the candidate's background. Keep tone professional, confident, and specific. Return JSON only.`;

  const userPrompt = `
Candidate profile:
- Name: ${profile.fullName}
- Email: ${profile.email}
- Location: ${profile.location}
- Summary: ${resumeSummary || profile.aboutYou}
- Strengths: ${profile.strengths}
- Remote preference: ${profile.remotePreference}
- Existing "Why this role" template: ${profile.whyThisRoleTemplate}

Target role: ${targetRole}
Target company: ${targetCompany}
Job description (if provided): ${jobDescription || 'N/A'}

Return strict JSON with keys: aboutYou, whyThisRoleTemplate, strengths, remotePreference.
- aboutYou: 4-6 sentences tailored to this role/company, truthful to the above.
- whyThisRoleTemplate: 3-5 sentences; include {role} and {company} placeholders where appropriate.
- strengths: 3 bullets or sentences focused on impact aligned to the description.
- remotePreference: short, clear statement aligned to candidate preference.
Only output JSON.`;

  const body = {
    model: 'grok-4-latest',
    stream: false,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };

  const resp = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Grok error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content || '';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error('Failed to parse Grok response. Got: ' + raw);
  }
  return parsed;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      resolve(base64 || '');
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function callGrokForResumeExtraction({ apiKey, fileName, mimeType, base64Data }) {
  const systemPrompt = `You extract structured info from a resume file (PDF/DOC/image provided as base64). Be truthful to the document. Return JSON only.`;

  const userPrompt = `
We captured a resume file. Extract concise info and return strict JSON.
File name: ${fileName}
Mime type: ${mimeType}
Base64 data:
${base64Data}

Return JSON with keys:
- resumeSummary: 3-5 sentences summarizing experience, stack, industries.
- aboutYou: 4-6 sentences in first person, suitable for "Tell us about yourself".
- strengths: 3 bullet-style sentences focused on impact and skills.
- remotePreference: 1-2 sentences if you see remote/hybrid preference; else a short neutral remote-friendly line.
Only output JSON.`;

  const body = {
    model: 'grok-4-latest',
    stream: false,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };

  const resp = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Grok error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content || '';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error('Failed to parse Grok response. Got: ' + raw);
  }
  return parsed;
}
