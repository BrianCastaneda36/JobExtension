const grokModel = 'grok-4-latest';
const MAX_FILE_SIZE = 2.5 * 1024 * 1024;

const fields = [
  'fullName',
  'email',
  'phone',
  'location',
  'linkedinUrl',
  'portfolioUrl',
  'username',
  'password',
  'desiredTitle',
  'expectedSalaryYearly',
  'expectedSalaryHourly',
  'availability',
  'workAuthorization',
  'googleClientId',
  'grokApiKey',
  'resumeSummary',
  'targetRole',
  'targetCompany',
  'jobDescription',
  'jdSummary',
  'roleBullets',
  'jdKeywords',
  'missingKeywords',
  'recruiterNote',
  'followupNote',
  'companySnapshot',
  'whyUsPoints',
  'interviewQuestions',
  'interviewTalkingPoints',
  'availabilitySnippet',
  'relocationSnippet',
  'clearanceSnippet',
  'portfolioSnippet',
  'matchedProjects',
  'salaryRole',
  'salaryLocation',
  'salaryEstimate',
  'aboutYou',
  'whyThisRoleTemplate',
  'strengths',
  'remotePreference',
  'assistantChatLog',
  'jobSuggestions',
  'autoSubmitDelay'
];

let currentProfile = null;
let cachedProjects = [];
let cachedPresets = [];
let resumeVariants = [];
let trackerData = [];
let grokState = { lastAction: null, lastPayload: null };
let eventsBound = false;
let jobQueue = [];

function getDefaultProfile() {
  return {
    fullName: 'Brian Adam Castaneda',
    email: 'brian.adam.castaneda@gmail.com',
    phone: '+1 (727) 404-7175',
    location: 'Orlando, FL',
    linkedinUrl: 'https://www.linkedin.com/in/brian-castaneda-405880170',
    portfolioUrl: 'https://briancastaneda.dev',
    resumeUrl: 'https://your-resume-link-here.com',
    username: 'Brianc3986',
    password: 'Emma3786!!',
    desiredTitle: 'Software Engineer / Full Stack Engineer / Data Engineer',
    expectedSalaryYearly: '$105,000 - $135,000 USD (flexible based on level, scope, and benefits)',
    expectedSalaryHourly: '$55 - $70/hr USD (flexible based on project and duration)',
    workAuthorization: 'US citizen, authorized to work for US employers. Open to fully remote roles while residing in Colombia, aligned to US Eastern time.',
    availability: 'Currently employed; available to start within 2-3 weeks of offer. Open to discussing earlier or phased start if needed.',
    disabilityStatus: 'I prefer not to say',
    veteranStatus: 'I am not a protected veteran',
    googleClientId: '',
    grokApiKey: '',
    resumeSummary: '',
    emphasizeKeywords: true,
    mockMode: false,
    grokLastGeneratedAt: '',
    grokLastExtractedAt: '',
    targetRole: '',
    targetCompany: '',
    jobDescription: '',
    jdSummary: '',
    jdKeywords: '',
    missingKeywords: '',
    recruiterNote: '',
    followupNote: '',
    roleBullets: '',
    companySnapshot: '',
    whyUsPoints: '',
    interviewQuestions: '',
    interviewTalkingPoints: '',
    availabilitySnippet: '',
    relocationSnippet: '',
    clearanceSnippet: '',
    portfolioSnippet: '',
    matchedProjects: '',
    projects: [],
    salaryRole: '',
    salaryLocation: '',
    salaryEstimate: '',
    resumeVariants: [],
    jobQueue: [],
    jobSuggestions: '',
    useLiveSuggestions: true,
    autoSubmitEnabled: false,
    autoSubmitDelay: 1200,
    assistantChatLog: '',
    activeResumeName: '',
    aboutYou: "I'm a software engineer and data-focused product professional with a background in credit risk, analytics, and automation. I've shipped internal tools, dashboards, and integrations using Python, SQL, Alteryx, and JavaScript/TypeScript that reduce manual work and give teams clearer visibility into their metrics. I enjoy owning problems end-to-end: clarifying requirements with stakeholders, designing a simple architecture, and then implementing, testing, and iterating on real-world feedback. I'm comfortable working remotely, communicating async, and collaborating across product, engineering, and operations.",
    whyThisRoleTemplate: "I'm excited about the {role} opportunity at {company} because it sits right at the intersection of engineering, data, and real business impact. I enjoy working on products where better tooling, automation, and analytics directly improve user outcomes and company performance. From my experience building internal dashboards, Python tools, and backend integrations, I've seen how much leverage a strong engineering team can create, and I'm looking for a place where I can contribute hands-on, ship quickly, and grow with a remote-first, high-ownership culture like yours.",
    strengths: 'My strengths are: (1) turning messy, real-world requirements into clear technical plans and small, shippable pieces; (2) building reliable tools and automation in Python, SQL, and JavaScript that reduce manual work and improve decision-making; and (3) communicating clearly with non-technical stakeholders so we\'re aligned on outcomes, trade-offs, and timelines. I\'m comfortable working independently in a remote environment, asking the right questions early, and taking ownership of results instead of just tickets.',
    remotePreference: 'Remote-first, ideally working core hours in US Eastern time. I\'m comfortable collaborating asynchronously with distributed teams, and I value clear written communication, well-defined ownership, and a culture that trusts engineers to manage their time and deliver outcomes.'
  };
}

document.addEventListener('DOMContentLoaded', init);

function init() {
  chrome.storage.sync.get(['profile', 'profiles', 'jobApplications'], (data) => {
    const profile = { ...getDefaultProfile(), ...(data.profile || {}) };
    currentProfile = profile;
    cachedProjects = profile.projects || [];
    cachedPresets = data.profiles || [];
    resumeVariants = profile.resumeVariants || [];
    jobQueue = profile.jobQueue || [];
    setFormFromProfile(profile);
    renderProjectSelect();
    renderResumeVariantSelect();
    renderProfileSelect();
    renderQueueSelect();
    updateTimestamps(profile);
    updateResumeBadge(profile);
    updateResumeVariantBadge(profile);
    updateExtractButtonState(profile);
    updateTrackerSnapshot(data.jobApplications || []);
    bindEventListeners();
    setSaveStatus('Profile loaded.');
  });
}

function bindEventListeners() {
  if (eventsBound) return;
  eventsBound = true;

  document.getElementById('saveBtn').addEventListener('click', handleSaveProfile);
  document.getElementById('importGrokKeyBtn').addEventListener('click', () => document.getElementById('grokKeyFile').click());
  document.getElementById('grokKeyFile').addEventListener('change', handleImportKeyFile);
  document.getElementById('clearGrokKeyBtn').addEventListener('click', () => {
    document.getElementById('grokApiKey').value = '';
    handleSaveProfile();
  });
  document.getElementById('generateGrokBtn').addEventListener('click', handleGenerateGrok);
  document.getElementById('extractResumeBtn').addEventListener('click', handleExtractResume);
  document.getElementById('deleteExtractedBtn').addEventListener('click', handleDeleteExtracted);
  document.getElementById('retryGrokBtn').addEventListener('click', handleRetryGrok);
  const jobSetupBtn = document.getElementById('jobSetupBtn');
  if (jobSetupBtn) jobSetupBtn.addEventListener('click', handleJobSetupAssistant);
  const resumeFileInput = document.getElementById('resumeFile');
  if (resumeFileInput) {
    resumeFileInput.addEventListener('change', () => updateExtractButtonState(currentProfile || {}));
  }

  document.getElementById('digestJDBtn').addEventListener('click', handleDigestJD);
  document.getElementById('interviewPrepBtn').addEventListener('click', handleInterviewPrep);
  document.getElementById('printPrepBtn').addEventListener('click', () => window.print());

  document.querySelectorAll('button[data-copy-src]').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-copy-src');
      const value = document.getElementById(src)?.value || '';
      copyToClipboard(value);
    });
  });

  document.getElementById('matchPortfolioBtn').addEventListener('click', handleMatchPortfolio);
  document.getElementById('saveProjectBtn').addEventListener('click', handleSaveProject);
  document.getElementById('deleteProjectBtn').addEventListener('click', handleDeleteProject);

  document.getElementById('salaryResearchBtn').addEventListener('click', handleSalaryResearch);
  document.getElementById('exportCsvBtn').addEventListener('click', handleExportCsv);
  document.getElementById('backupSettingsBtn').addEventListener('click', handleBackupSettings);
  document.getElementById('restoreSettingsBtn').addEventListener('click', () => document.getElementById('settingsFileInput').click());
  document.getElementById('settingsFileInput').addEventListener('change', handleRestoreSettings);

  document.getElementById('addResumeVariantBtn').addEventListener('click', handleSaveResumeVariant);
  document.getElementById('applyResumeVariantBtn').addEventListener('click', handleApplyResumeVariant);
  document.getElementById('deleteResumeVariantBtn').addEventListener('click', handleDeleteResumeVariant);
  const exportResumeBtn = document.getElementById('exportTargetedResumeBtn');
  if (exportResumeBtn) exportResumeBtn.addEventListener('click', handleExportTargetedResume);
  document.getElementById('addQueueBtn').addEventListener('click', handleSaveQueueItem);
  document.getElementById('deleteQueueBtn').addEventListener('click', handleDeleteQueueItem);
  document.getElementById('clearJobQueueBtn').addEventListener('click', handleClearQueue);
  const fetchSuggestionsBtn = document.getElementById('fetchSuggestionsBtn');
  if (fetchSuggestionsBtn) fetchSuggestionsBtn.addEventListener('click', handleFetchSuggestions);
  const queueSuggestionsBtn = document.getElementById('queueSuggestionsBtn');
  if (queueSuggestionsBtn) queueSuggestionsBtn.addEventListener('click', handleQueueSuggestions);
  const askBtn = document.getElementById('assistantAskBtn');
  if (askBtn) askBtn.addEventListener('click', handleAssistantAsk);
  const clearChatBtn = document.getElementById('assistantClearBtn');
  if (clearChatBtn) clearChatBtn.addEventListener('click', () => {
    const log = document.getElementById('assistantChatLog');
    if (log) log.value = '';
    const profile = collectProfileFromForm(currentProfile);
    profile.assistantChatLog = '';
    persistProfile(profile);
  });

  document.getElementById('applyProfileBtn').addEventListener('click', handleApplyPreset);
  document.getElementById('saveProfileBtn').addEventListener('click', handleSavePreset);
  document.getElementById('deleteProfileBtn').addEventListener('click', handleDeletePreset);

  document.getElementById('openTrackerBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('tracker.html') });
  });
  document.getElementById('trackerSearch').addEventListener('input', filterTracker);
  document.querySelectorAll('#trackerFilters .filter-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#trackerFilters .filter-pill').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      filterTracker();
    });
  });
}

function setFormFromProfile(profile) {
  fields.forEach(id => setFieldValue(id, profile[id]));
  document.getElementById('emphasizeKeywords').checked = Boolean(profile.emphasizeKeywords);
  document.getElementById('mockMode').checked = Boolean(profile.mockMode);
  const autoSubmitToggle = document.getElementById('autoSubmitEnabled');
  if (autoSubmitToggle) autoSubmitToggle.checked = Boolean(profile.autoSubmitEnabled);
  const autoSubmitDelay = document.getElementById('autoSubmitDelay');
  if (autoSubmitDelay && profile.autoSubmitDelay) autoSubmitDelay.value = profile.autoSubmitDelay;
  const useLiveSuggestions = document.getElementById('useLiveSuggestions');
  if (useLiveSuggestions) useLiveSuggestions.checked = Boolean(profile.useLiveSuggestions);
  document.getElementById('disabilityStatus').value = profile.disabilityStatus || '';
  document.getElementById('veteranStatus').value = profile.veteranStatus || '';
}

function setFieldValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === 'checkbox') {
    el.checked = Boolean(value);
  } else {
    el.value = value || '';
  }
}

async function handleSaveProfile() {
  const profile = collectProfileFromForm(currentProfile);
  await persistProfile(profile);
  currentProfile = profile;
  updateResumeBadge(profile);
  updateResumeVariantBadge(profile);
  setSaveStatus('Profile saved.');
}

function collectProfileFromForm(existing = {}) {
  const base = { ...getDefaultProfile(), ...existing };
  const profile = { ...base };

  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      profile[id] = el.checked;
    } else {
      profile[id] = el.value || '';
    }
  });

  profile.emphasizeKeywords = document.getElementById('emphasizeKeywords').checked;
  profile.mockMode = document.getElementById('mockMode').checked;
  profile.autoSubmitEnabled = document.getElementById('autoSubmitEnabled')?.checked || false;
  profile.autoSubmitDelay = parseInt(document.getElementById('autoSubmitDelay')?.value || '1200', 10);
  profile.useLiveSuggestions = document.getElementById('useLiveSuggestions')?.checked || false;
  profile.disabilityStatus = document.getElementById('disabilityStatus').value;
  profile.veteranStatus = document.getElementById('veteranStatus').value;
  profile.projects = cachedProjects;
  profile.resumeVariants = resumeVariants;
  profile.jobQueue = jobQueue;
  profile.matchedProjects = document.getElementById('matchedProjects')?.value || '';
  return profile;
}

function handleSaveQueueItem() {
  const company = (document.getElementById('queueCompany').value || '').trim();
  const title = (document.getElementById('queueTitle').value || '').trim();
  const url = (document.getElementById('queueUrl').value || '').trim();
  if (!url) return;
  const existingIdx = jobQueue.findIndex(item => item.url === url);
  const entry = { company, title, url };
  if (existingIdx >= 0) {
    jobQueue[existingIdx] = entry;
  } else {
    jobQueue.push(entry);
  }
  renderQueueSelect();
  persistProfile(collectProfileFromForm(currentProfile));
}

function handleDeleteQueueItem() {
  const select = document.getElementById('queueSelect');
  const url = select?.value;
  if (!url) return;
  jobQueue = jobQueue.filter(item => item.url !== url);
  renderQueueSelect();
  persistProfile(collectProfileFromForm(currentProfile));
}

function handleClearQueue() {
  jobQueue = [];
  renderQueueSelect();
  persistProfile(collectProfileFromForm(currentProfile));
}

async function handleJobSetupAssistant() {
  const input = document.getElementById('jobSetupInput')?.value || '';
  const outputEl = document.getElementById('jobSetupOutput');
  if (!input) {
    if (outputEl) outputEl.value = 'Please describe the jobs you want.';
    return;
  }
  const profile = collectProfileFromForm(currentProfile);
  try {
    const suggestion = await callGrokForProfileSetup(profile, input);
    const parts = [];
    if (suggestion.targetRole) {
      document.getElementById('targetRole').value = suggestion.targetRole;
      document.getElementById('desiredTitle').value = suggestion.targetRole;
      parts.push(`Role: ${suggestion.targetRole}`);
    }
    if (suggestion.targetCompany) {
      document.getElementById('targetCompany').value = suggestion.targetCompany;
      parts.push(`Company: ${suggestion.targetCompany}`);
    }
    if (suggestion.location) {
      document.getElementById('location').value = suggestion.location;
      parts.push(`Location: ${suggestion.location}`);
    }
    if (suggestion.salary) {
      document.getElementById('expectedSalaryYearly').value = suggestion.salary;
      parts.push(`Salary: ${suggestion.salary}`);
    }
    if (suggestion.remotePreference) {
      document.getElementById('remotePreference').value = suggestion.remotePreference;
      parts.push(`Remote: ${suggestion.remotePreference}`);
    }
    if (outputEl) outputEl.value = parts.join('\n') || 'Applied updates.';
    const updated = collectProfileFromForm(profile);
    await persistProfile(updated);
    currentProfile = updated;
  } catch (err) {
    if (outputEl) outputEl.value = `Assistant failed: ${err.message || err}`;
  }
}

async function handleAssistantAsk() {
  const question = document.getElementById('assistantChatInput')?.value || '';
  const log = document.getElementById('assistantChatLog');
  if (!question.trim()) {
    if (log) log.value = 'Please enter a question.';
    return;
  }
  const profile = collectProfileFromForm(currentProfile);
  if (log) log.value = `${log.value ? log.value + '\n' : ''}You: ${question}\nGrok: ...`;
  try {
    const reply = await callGrokChat(profile, question);
    if (log) log.value = `${log.value.split('\nGrok: ...')[0]}\nGrok: ${reply}`;
    profile.assistantChatLog = log ? log.value : '';
    await persistProfile(profile);
    currentProfile = profile;
  } catch (err) {
    if (log) log.value = `Error: ${err.message || err}`;
  }
}

async function handleFetchSuggestions() {
  const profile = collectProfileFromForm(currentProfile);
  const outputEl = document.getElementById('jobSuggestions');
  if (outputEl) outputEl.value = 'Fetching suggestions...';
  try {
    let suggestions = [];
    if (profile.useLiveSuggestions) {
      suggestions = await callLiveSuggestions(profile);
    }
    if (!suggestions || suggestions.length === 0) {
      suggestions = await callGrokForSuggestions(profile);
    }
    const text = suggestions.map(s => `${s.title} @ ${s.company}${s.url ? ` — ${s.url}` : ''}`).join('\n');
    if (outputEl) outputEl.value = text || 'No suggestions yet.';
    profile.jobSuggestions = text;
    await persistProfile(profile);
    currentProfile = profile;
  } catch (err) {
    if (outputEl) outputEl.value = `Suggestion error: ${err.message || err}`;
  }
}

async function handleQueueSuggestions() {
  const text = document.getElementById('jobSuggestions')?.value || '';
  if (!text.trim()) return;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  lines.forEach(line => {
    const parts = line.split('-');
    const left = parts[0] || '';
    const url = parts[1]?.trim() || '';
    const [titlePart, companyPart] = left.split('@').map(p => (p || '').trim());
    if (url) {
      const entry = { title: titlePart, company: companyPart, url };
      const exists = jobQueue.find(i => i.url === entry.url);
      if (!exists) jobQueue.push(entry);
    }
  });
  renderQueueSelect();
  persistProfile(collectProfileFromForm(currentProfile));
}

function renderProjectSelect() {
  const select = document.getElementById('projectSelect');
  if (!select) return;
  select.innerHTML = cachedProjects.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');
}

function renderResumeVariantSelect() {
  const select = document.getElementById('resumeVariantSelect');
  if (!select) return;
  select.innerHTML = resumeVariants.map(v => `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>`).join('');
}

function renderProfileSelect() {
  const select = document.getElementById('profileSelect');
  if (!select) return;
  select.innerHTML = cachedPresets.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');
}

function renderQueueSelect() {
  const select = document.getElementById('queueSelect');
  if (!select) return;
  select.innerHTML = jobQueue.map(item => `<option value="${escapeHtml(item.url)}">${escapeHtml(item.company || 'Company')} - ${escapeHtml(item.title || 'Role')}</option>`).join('');
}

function updateResumeBadge(profile) {
  const badge = document.getElementById('activeResumeBadge');
  if (!badge) return;
  badge.textContent = `Active resume: ${profile.activeResumeName || 'default'}`;
}

function updateResumeVariantBadge(profile) {
  const badge = document.getElementById('resumeStatus');
  if (!badge) return;
  if (profile.grokLastExtractedAt || (profile.resumeSummary && profile.resumeSummary.length > 0)) {
    badge.textContent = 'Extracted';
    badge.classList.add('badge-success');
  } else {
    badge.textContent = 'Not extracted';
    badge.classList.remove('badge-success');
  }
}

function updateExtractButtonState(profile) {
  const extractBtn = document.getElementById('extractResumeBtn');
  if (!extractBtn) return;
  const hasFileInput = document.getElementById('resumeFile');
  extractBtn.disabled = hasFileInput && hasFileInput.files.length === 0 && !(profile.resumeSummary && profile.resumeSummary.length);
}

function updateTimestamps(profile) {
  const lastExt = document.getElementById('lastExtractedAt');
  const lastGen = document.getElementById('lastGeneratedAt');
  if (lastExt) lastExt.textContent = `Last extract: ${profile.grokLastExtractedAt ? formatDate(profile.grokLastExtractedAt) : 'n/a'}`;
  if (lastGen) lastGen.textContent = `Last generate: ${profile.grokLastGeneratedAt ? formatDate(profile.grokLastGeneratedAt) : 'n/a'}`;
}

function setSaveStatus(text, success = true) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.textContent = text;
  el.style.opacity = 1;
  el.style.color = success ? '' : '#f87171';
  setTimeout(() => (el.style.opacity = 0), 2200);
}

function setGrokStatus(text) {
  const el = document.getElementById('grokStatus');
  if (el) el.textContent = text;
}

function setGrokError(text) {
  const el = document.getElementById('grokErrorLog');
  if (el) el.textContent = text;
}

async function handleImportKeyFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  document.getElementById('grokApiKey').value = text.trim();
  handleSaveProfile();
}

async function handleGenerateGrok() {
  const profile = collectProfileFromForm(currentProfile);
  setGrokStatus('Generating tailored answers...');
  setGrokError('');
  grokState.lastAction = 'generate';
  grokState.lastPayload = { targetRole: profile.targetRole, targetCompany: profile.targetCompany, jobDescription: profile.jobDescription };
  try {
    const answers = await callGrokForAnswers(profile);
    if (answers.aboutYou) document.getElementById('aboutYou').value = answers.aboutYou;
    if (answers.whyThisRole) document.getElementById('whyThisRoleTemplate').value = answers.whyThisRole;
    if (answers.strengths) document.getElementById('strengths').value = answers.strengths;
    if (answers.remotePreference) document.getElementById('remotePreference').value = answers.remotePreference;
    if (answers.roleBullets) document.getElementById('roleBullets').value = answers.roleBullets;
    profile.aboutYou = document.getElementById('aboutYou').value;
    profile.whyThisRoleTemplate = document.getElementById('whyThisRoleTemplate').value;
    profile.strengths = document.getElementById('strengths').value;
    profile.remotePreference = document.getElementById('remotePreference').value;
    profile.roleBullets = document.getElementById('roleBullets').value || profile.roleBullets;
    profile.grokLastGeneratedAt = new Date().toISOString();
    await persistProfile(profile);
    currentProfile = profile;
    updateTimestamps(profile);
    setGrokStatus('Tailored answers generated.');
  } catch (err) {
    console.error(err);
    setGrokStatus('Generation failed.');
    setGrokError(String(err.message || err));
  }
}

async function handleExtractResume() {
  const fileInput = document.getElementById('resumeFile');
  const file = fileInput?.files?.[0];
  if (!file) {
    setGrokError('Please choose a resume file to extract.');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    setGrokError('File too large. Please keep under ~2.5MB.');
    return;
  }

  const profile = collectProfileFromForm(currentProfile);
  setGrokStatus('Extracting resume...');
  setGrokError('');
  const fileData = await readFileAsBase64(file);
  grokState.lastAction = 'extract';
  grokState.lastPayload = { fileData, fileName: file.name };

  try {
    const extraction = await callGrokForResumeExtraction(profile, fileData);
    if (extraction.resumeSummary) document.getElementById('resumeSummary').value = extraction.resumeSummary;
    if (extraction.aboutYou) document.getElementById('aboutYou').value = extraction.aboutYou;
    if (extraction.strengths) document.getElementById('strengths').value = extraction.strengths;
    if (extraction.remotePreference) document.getElementById('remotePreference').value = extraction.remotePreference;
    profile.resumeSummary = document.getElementById('resumeSummary').value;
    profile.aboutYou = document.getElementById('aboutYou').value;
    profile.strengths = document.getElementById('strengths').value;
    profile.remotePreference = document.getElementById('remotePreference').value;
    profile.grokLastExtractedAt = new Date().toISOString();
    await persistProfile(profile);
    currentProfile = profile;
    updateTimestamps(profile);
    updateResumeVariantBadge(profile);
    setGrokStatus('Resume extracted.');
  } catch (err) {
    console.error(err);
    setGrokStatus('Extraction failed.');
    setGrokError(String(err.message || err));
  }
}

async function handleDeleteExtracted() {
  const profile = collectProfileFromForm(currentProfile);
  profile.resumeSummary = '';
  profile.grokLastExtractedAt = '';
  document.getElementById('resumeSummary').value = '';
  updateResumeVariantBadge(profile);
  updateTimestamps(profile);
  await persistProfile(profile);
  currentProfile = profile;
  setGrokStatus('Extracted data cleared.');
}

async function handleRetryGrok() {
  if (!grokState.lastAction) return;
  if (grokState.lastAction === 'generate') {
    handleGenerateGrok();
  } else if (grokState.lastAction === 'extract' && grokState.lastPayload?.fileData) {
    const profile = collectProfileFromForm(currentProfile);
    setGrokStatus('Retrying extract...');
    setGrokError('');
    try {
      const extraction = await callGrokForResumeExtraction(profile, grokState.lastPayload.fileData);
      if (extraction.resumeSummary) document.getElementById('resumeSummary').value = extraction.resumeSummary;
      profile.resumeSummary = document.getElementById('resumeSummary').value;
      profile.grokLastExtractedAt = new Date().toISOString();
      await persistProfile(profile);
      currentProfile = profile;
      updateTimestamps(profile);
      updateResumeVariantBadge(profile);
      setGrokStatus('Resume extracted.');
    } catch (err) {
      setGrokStatus('Retry failed.');
      setGrokError(String(err.message || err));
    }
  }
}

async function handleDigestJD() {
  const profile = collectProfileFromForm(currentProfile);
  setGrokStatus('Digesting JD...');
  setGrokError('');
  grokState.lastAction = 'digest';
  grokState.lastPayload = { jobDescription: profile.jobDescription };
  try {
    const digest = await callGrokForJDDigest(profile);
    setDigestFields(digest);
    profile.jdSummary = document.getElementById('jdSummary').value;
    profile.jdKeywords = document.getElementById('jdKeywords').value;
    profile.missingKeywords = document.getElementById('missingKeywords').value;
    profile.roleBullets = document.getElementById('roleBullets').value;
    profile.recruiterNote = document.getElementById('recruiterNote').value;
    profile.followupNote = document.getElementById('followupNote').value;
    profile.companySnapshot = document.getElementById('companySnapshot').value;
    profile.whyUsPoints = document.getElementById('whyUsPoints').value;
    profile.interviewQuestions = document.getElementById('interviewQuestions').value;
    profile.interviewTalkingPoints = document.getElementById('interviewTalkingPoints').value;
    profile.grokLastGeneratedAt = new Date().toISOString();
    await persistProfile(profile);
    currentProfile = profile;
    updateTimestamps(profile);
    setGrokStatus('JD digested.');
  } catch (err) {
    console.error(err);
    setGrokStatus('JD digest failed.');
    setGrokError(String(err.message || err));
  }
}

async function handleInterviewPrep() {
  const profile = collectProfileFromForm(currentProfile);
  setGrokStatus('Building interview prep...');
  setGrokError('');
  try {
    const digest = await callGrokForJDDigest(profile);
    setDigestFields(digest);
    profile.interviewQuestions = document.getElementById('interviewQuestions').value;
    profile.interviewTalkingPoints = document.getElementById('interviewTalkingPoints').value;
    await persistProfile(profile);
    currentProfile = profile;
    setGrokStatus('Interview prep ready.');
  } catch (err) {
    console.error(err);
    setGrokStatus('Interview prep failed.');
    setGrokError(String(err.message || err));
  }
}

function setDigestFields(digest) {
  if (!digest) return;
  if (digest.summary) document.getElementById('jdSummary').value = digest.summary;
  if (digest.keywords) document.getElementById('jdKeywords').value = digest.keywords.join(', ');
  if (digest.missingKeywords) document.getElementById('missingKeywords').value = digest.missingKeywords.join(', ');
  if (digest.roleBullets) document.getElementById('roleBullets').value = digest.roleBullets.join('\n');
  if (digest.recruiterNote) document.getElementById('recruiterNote').value = digest.recruiterNote;
  if (digest.followupNote) document.getElementById('followupNote').value = digest.followupNote;
  if (digest.companySnapshot) document.getElementById('companySnapshot').value = digest.companySnapshot;
  if (digest.whyUsPoints) document.getElementById('whyUsPoints').value = digest.whyUsPoints.join('\n');
  if (digest.interviewQuestions) document.getElementById('interviewQuestions').value = digest.interviewQuestions.join('\n');
  if (digest.interviewTalkingPoints) document.getElementById('interviewTalkingPoints').value = digest.interviewTalkingPoints.join('\n');
}

function handleSaveProject() {
  const name = (document.getElementById('projectName').value || '').trim();
  const url = (document.getElementById('projectUrl').value || '').trim();
  const tags = (document.getElementById('projectTags').value || '').split(',').map(t => t.trim()).filter(Boolean);
  if (!name) return;
  const existingIdx = cachedProjects.findIndex(p => p.name === name);
  const project = { name, url, tags };
  if (existingIdx >= 0) {
    cachedProjects[existingIdx] = project;
  } else {
    cachedProjects.push(project);
  }
  renderProjectSelect();
  persistProfile(collectProfileFromForm(currentProfile));
}

function handleDeleteProject() {
  const select = document.getElementById('projectSelect');
  const name = select?.value;
  if (!name) return;
  cachedProjects = cachedProjects.filter(p => p.name !== name);
  renderProjectSelect();
  persistProfile(collectProfileFromForm(currentProfile));
}

function handleMatchPortfolio() {
  const profile = collectProfileFromForm(currentProfile);
  const jdText = [profile.jobDescription, profile.jdSummary, profile.targetRole, profile.targetCompany].filter(Boolean).join(' ').toLowerCase();
  const scores = cachedProjects.map(p => {
    const tags = p.tags || [];
    const hits = tags.filter(tag => jdText.includes(tag.toLowerCase()));
    return { project: p, score: hits.length };
  }).sort((a, b) => b.score - a.score);

  const matches = scores.filter(s => s.score > 0);
  const output = matches.length
    ? matches.map(s => `- ${s.project.name} (${s.project.url || 'no link'}) — tags: ${(s.project.tags || []).join(', ')}`).join('\n')
    : 'No strong matches yet. Add tags to projects or paste a fuller JD.';

  document.getElementById('matchedProjects').value = output;
  profile.matchedProjects = output;
  persistProfile(profile);
}

function handleSaveResumeVariant() {
  const name = (document.getElementById('resumeVariantName').value || '').trim();
  const url = (document.getElementById('resumeVariantUrl').value || '').trim();
  if (!name || !url) return;
  const idx = resumeVariants.findIndex(v => v.name === name);
  const variant = { name, url };
  if (idx >= 0) {
    resumeVariants[idx] = variant;
  } else {
    resumeVariants.push(variant);
  }
  renderResumeVariantSelect();
  persistProfile(collectProfileFromForm(currentProfile));
}

async function handleApplyResumeVariant() {
  const select = document.getElementById('resumeVariantSelect');
  const name = select?.value;
  if (!name) return;
  const variant = resumeVariants.find(v => v.name === name);
  if (!variant) return;
  const profile = collectProfileFromForm(currentProfile);
  profile.resumeUrl = variant.url;
  profile.activeResumeName = variant.name;
  await persistProfile(profile);
  currentProfile = profile;
  updateResumeBadge(profile);
}

function handleDeleteResumeVariant() {
  const select = document.getElementById('resumeVariantSelect');
  const name = select?.value;
  if (!name) return;
  resumeVariants = resumeVariants.filter(v => v.name !== name);
  renderResumeVariantSelect();
  const profile = collectProfileFromForm(currentProfile);
  if (profile.activeResumeName === name) {
    profile.activeResumeName = '';
  }
  persistProfile(profile);
  updateResumeBadge(profile);
}

function handleExportTargetedResume() {
  const profile = collectProfileFromForm(currentProfile);
  const content = [
    `Role: ${profile.targetRole || 'N/A'}`,
    `Company: ${profile.targetCompany || 'N/A'}`,
    '',
    `Resume URL: ${profile.resumeUrl || 'N/A'}`,
    '',
    'Resume summary:',
    profile.resumeSummary || '(not extracted)',
    '',
    'Role bullets:',
    profile.roleBullets || '(none yet)',
    '',
    'Why-us points:',
    profile.whyUsPoints || '(none yet)'
  ].join('\n');
  downloadFile('targeted-resume.txt', content, 'text/plain');
}

async function handleSalaryResearch() {
  const role = (document.getElementById('salaryRole').value || '').trim();
  const location = (document.getElementById('salaryLocation').value || '').trim();
  let estimate = buildSalaryEstimate(role.toLowerCase(), location.toLowerCase());
  const profile = collectProfileFromForm(currentProfile);
  try {
    const grokEstimate = await callGrokForSalary(profile, role, location);
    if (grokEstimate) {
      estimate = grokEstimate;
    }
  } catch (err) {
    console.warn('Salary research fallback to heuristic', err);
  }
  document.getElementById('salaryEstimate').value = estimate;
  profile.salaryEstimate = estimate;
  profile.salaryRole = role;
  profile.salaryLocation = location;
  persistProfile(profile);
}

async function handleExportCsv() {
  const data = await chrome.storage.sync.get('jobApplications');
  const rows = data.jobApplications || [];
  if (!rows.length) return;
  const headers = ['Company', 'Job Title', 'Source', 'Location', 'Salary', 'Salary Location', 'Status', 'Applied At', 'Follow-up Due', 'Notes', 'URL'];
  const csv = [headers.join(',')].concat(rows.map(r => [
    escapeCsv(r.company),
    escapeCsv(r.jobTitle),
    escapeCsv(r.source),
    escapeCsv(r.location),
    escapeCsv(r.salaryExpectation),
    escapeCsv(r.salaryLocation),
    escapeCsv(r.status),
    escapeCsv(r.appliedAt),
    escapeCsv(r.followUpDue),
    escapeCsv(r.notes || ''),
    escapeCsv(r.url || '')
  ].join(','))).join('\n');
  downloadFile('applications.csv', csv, 'text/csv');
}

async function handleBackupSettings() {
  const data = await chrome.storage.sync.get(null);
  downloadFile('jobseeker-backup.json', JSON.stringify(data, null, 2), 'application/json');
}

async function handleRestoreSettings(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    await chrome.storage.sync.set(data);
    setSaveStatus('Settings restored. Reloading...');
    setTimeout(() => window.location.reload(), 600);
  } catch (err) {
    setSaveStatus('Restore failed: invalid file.', false);
  }
}

async function handleSavePreset() {
  const name = (document.getElementById('profileName').value || '').trim();
  if (!name) return;
  const profile = collectProfileFromForm(currentProfile);
  const idx = cachedPresets.findIndex(p => p.name === name);
  if (idx >= 0) {
    cachedPresets[idx] = { name, profile };
  } else {
    cachedPresets.push({ name, profile });
  }
  await chrome.storage.sync.set({ profiles: cachedPresets });
  renderProfileSelect();
  setSaveStatus('Profile preset saved.');
}

async function handleApplyPreset() {
  const select = document.getElementById('profileSelect');
  const name = select?.value;
  const preset = cachedPresets.find(p => p.name === name);
  if (!preset) return;
  currentProfile = { ...getDefaultProfile(), ...preset.profile };
  cachedProjects = currentProfile.projects || [];
  resumeVariants = currentProfile.resumeVariants || [];
  setFormFromProfile(currentProfile);
  renderProjectSelect();
  renderResumeVariantSelect();
  updateResumeBadge(currentProfile);
  updateExtractButtonState(currentProfile);
}

async function handleDeletePreset() {
  const select = document.getElementById('profileSelect');
  const name = select?.value;
  if (!name) return;
  cachedPresets = cachedPresets.filter(p => p.name !== name);
  await chrome.storage.sync.set({ profiles: cachedPresets });
  renderProfileSelect();
}

function updateTrackerSnapshot(apps) {
  trackerData = apps || [];
  const total = trackerData.length;
  const last7 = trackerData.filter(a => new Date(a.appliedAt).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000).length;
  const interviewing = trackerData.filter(a => a.status === 'INTERVIEW' || a.status === 'ADVANCING').length;
  const offers = trackerData.filter(a => a.status === 'OFFER').length;
  document.getElementById('trackerTotal').textContent = total;
  document.getElementById('trackerLast7').textContent = last7;
  document.getElementById('trackerInterview').textContent = interviewing;
  document.getElementById('trackerOffer').textContent = offers;
  renderTrackerList(trackerData);
}

function filterTracker() {
  const search = document.getElementById('trackerSearch').value.toLowerCase();
  const activeFilter = document.querySelector('#trackerFilters .filter-pill.active')?.dataset.filter || 'all';
  let filtered = trackerData;
  if (activeFilter !== 'all') {
    filtered = filtered.filter(a => a.status === activeFilter);
  }
  if (search) {
    filtered = filtered.filter(a => (a.company || '').toLowerCase().includes(search) || (a.jobTitle || '').toLowerCase().includes(search));
  }
  renderTrackerList(filtered);
}

function renderTrackerList(apps) {
  const container = document.getElementById('trackerList');
  if (!container) return;
  if (!apps || apps.length === 0) {
    container.innerHTML = '<div class="empty-state">No applications logged yet.</div>';
    return;
  }
  container.innerHTML = apps.map(app => {
    const source = app.source || 'Direct';
    const applied = app.appliedAt ? formatDate(app.appliedAt) : 'n/a';
    const salary = app.salaryExpectation ? `Est: ${app.salaryExpectation}${app.salaryLocation ? ` (${app.salaryLocation})` : ''}` : '';
    const remote = app.remotePreference || '';
    return `
      <div class="job-card job-card--compact">
        <div class="job-card-header">
          <div>
            <div class="job-company">${escapeHtml(app.company || 'Unknown')}</div>
            <div class="job-title">${escapeHtml(app.jobTitle || 'Job')}</div>
          </div>
          <span class="status-pill status-pill--${(app.status || 'APPLIED').toLowerCase()}">${escapeHtml(app.status || 'APPLIED')}</span>
        </div>
        <div class="job-card-meta">
          <span>${escapeHtml(source)}</span>
          <span>${escapeHtml(applied)}</span>
          ${salary ? `<span>${escapeHtml(salary)}</span>` : ''}
      ${remote ? `<span>${escapeHtml(remote)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function buildSalaryEstimate(role, location) {
  const baseLow = role.includes('senior') || role.includes('staff') ? 120000 : 90000;
  const baseHigh = role.includes('senior') || role.includes('staff') ? 165000 : 125000;
  const factors = {
    'new york': 1.2,
    'sf': 1.25,
    'san francisco': 1.25,
    'bay area': 1.25,
    'seattle': 1.15,
    'austin': 1.05,
    'boston': 1.1,
    'miami': 1.05,
    'orlando': 1.0,
    'remote': 1.0,
    'dallas': 1.05
  };
  const key = Object.keys(factors).find(k => location.includes(k)) || 'remote';
  const factor = factors[key] || 1;
  const low = Math.round(baseLow * factor / 1000) * 1000;
  const high = Math.round(baseHigh * factor / 1000) * 1000;
  return `$${low.toLocaleString()} - $${high.toLocaleString()} (est, ${location || 'remote'})`;
}

async function callGrokForSalary(profile, role, location) {
  if (profile.mockMode || !profile.grokApiKey) {
    return buildSalaryEstimate((role || '').toLowerCase(), (location || '').toLowerCase());
  }

  const payload = {
    model: grokModel,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'Estimate a realistic base salary range in USD for the given software role and location. Keep it concise like "$X - $Y USD". Do not fabricate guarantees.'
      },
      {
        role: 'user',
        content: JSON.stringify({ role, location, experience: profile.resumeSummary || profile.targetRole })
      }
    ],
    stream: false
  };

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${profile.grokApiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`Grok salary error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  return text || buildSalaryEstimate((role || '').toLowerCase(), (location || '').toLowerCase());
}

async function callGrokForAnswers(profile) {
  if (profile.mockMode || !profile.grokApiKey) {
    return {
      aboutYou: `I'm a ${profile.targetRole || 'software engineer'} who ships reliable, user-focused products across ${profile.jobDescription ? 'the posted requirements' : 'full-stack'} work. I work in tight feedback loops, keep communication crisp, and focus on measurable impact.`,
      whyThisRole: `I'm excited about the ${profile.targetRole || 'role'} at ${profile.targetCompany || 'your team'} because the problems map to my background building data-rich, performant web products. I want to help ship quickly, iterate on user feedback, and collaborate with product/ops in a remote-friendly culture.`,
      strengths: 'Planning in small, shippable slices; building reliable automation and APIs; translating ambiguous requirements into clear plans; collaborating async with tight written comms.',
      remotePreference: 'Remote-first, US Eastern aligned. Comfortable async, clear written updates, and pairing when needed.'
    };
  }

  const payload = {
    model: grokModel,
    temperature: 0.35,
    messages: [
      {
        role: 'system',
        content: 'You help a job seeker craft first-person, truthful answers. Keep answers concise, avoid fabricating numbers or employers, and keep it consistent with the provided resume summary.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          targetRole: profile.targetRole,
          targetCompany: profile.targetCompany,
          jobDescription: profile.jobDescription,
          resumeSummary: profile.resumeSummary,
          emphasizeKeywords: profile.emphasizeKeywords
        })
      }
    ],
    stream: false
  };

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${profile.grokApiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Grok error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim() || '';
  try {
    return JSON.parse(text);
  } catch {
    return {
      aboutYou: text,
      whyThisRole: text,
      strengths: text,
      remotePreference: profile.remotePreference
    };
  }
}

async function callGrokForResumeExtraction(profile, fileData) {
  if (profile.mockMode || !profile.grokApiKey) {
    return {
      resumeSummary: 'Full-stack engineer across React/Node/TypeScript and data-heavy products. Ships dashboards, APIs, and automation that reduce manual work and improve decision-making.',
      aboutYou: 'I build pragmatic, reliable products across the stack with a bias for small, shippable increments and close collaboration.',
      strengths: 'Breaking down ambiguous work; building resilient services; partnering with stakeholders and iterating fast.',
      remotePreference: profile.remotePreference
    };
  }

  const payload = {
    model: grokModel,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'Extract a concise, first-person summary and strengths from the provided resume. Do not invent employers or numbers.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          fileName: fileData.name,
          mimeType: fileData.mimeType,
          base64: fileData.base64
        })
      }
    ],
    stream: false
  };

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${profile.grokApiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Grok error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim() || '';
  try {
    return JSON.parse(text);
  } catch {
    return { resumeSummary: text };
  }
}

async function callGrokForJDDigest(profile) {
  if (profile.mockMode || !profile.grokApiKey) {
    return {
      summary: 'Senior full-stack role: React/TypeScript front-end, Node/GraphQL services, cloud infrastructure, and data integrations. Focus on shipping user-facing features, performance, and reliability.',
      keywords: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS', 'PostgreSQL'],
      missingKeywords: ['Observability', 'CI/CD'],
      roleBullets: [
        'Built dashboards and APIs that reduced manual reporting by 60% and improved latency by 30%.',
        'Designed event-driven data pipelines and analytics features with React/Node/Postgres.',
        'Partnered with product/ops to ship iteratively and validate impact quickly.'
      ],
      recruiterNote: "Hi! I'm a full-stack engineer who ships React/TypeScript frontends and Node/GraphQL services. I've led data-heavy feature work and would love to help ship quickly on your roadmap.",
      followupNote: "Checking in on my application — excited about the role and happy to share code samples or walk through similar work in analytics dashboards and Node services.",
      companySnapshot: 'Grok summary: mission-driven team, modern stack (React/Node/AWS), growth-stage environment.',
      whyUsPoints: [
        'You operate at the intersection of data and user experience — that matches my background shipping analytics products.',
        'You value fast iterations and ownership; I thrive in high-ownership, async-friendly teams.'
      ],
      interviewQuestions: [
        'How do you measure success for this role in the first 90 days?',
        'What are the main technical constraints or bottlenecks today?'
      ],
      interviewTalkingPoints: [
        'Scaling React/Node apps with strong observability and performance wins.',
        'Shipping data dashboards that reduced manual workflows for ops teams.'
      ]
    };
  }

  const payload = {
    model: grokModel,
    temperature: 0.25,
    messages: [
      { role: 'system', content: 'Summarize the JD, list keywords, suggest missing keywords, tailored bullets, recruiter + follow-up notes, company snapshot, why-us points, interview questions, and talking points. Answer in JSON with keys: summary, keywords (array), missingKeywords (array), roleBullets (array), recruiterNote, followupNote, companySnapshot, whyUsPoints (array), interviewQuestions (array), interviewTalkingPoints (array). Keep content first-person where applicable.' },
      { role: 'user', content: JSON.stringify({ jobDescription: profile.jobDescription, targetRole: profile.targetRole, targetCompany: profile.targetCompany, resumeSummary: profile.resumeSummary }) }
    ],
    stream: false
  };

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${profile.grokApiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Grok error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim() || '';
  try {
    return JSON.parse(text);
  } catch {
    return { summary: text };
  }
}

async function callGrokForProfileSetup(profile, description) {
  if (profile.mockMode || !profile.grokApiKey) {
    return {
      targetRole: 'Senior Full-Stack Engineer',
      targetCompany: 'Remote-first SaaS',
      location: 'Remote, US Eastern',
      salary: '$130,000 - $155,000 USD',
      remotePreference: 'Remote-first, US Eastern aligned'
    };
  }

  const payload = {
    model: grokModel,
    temperature: 0.25,
    messages: [
      {
        role: 'system',
        content: 'Given a job search description, propose targetRole, targetCompany, location, salary (string), and remotePreference. Keep it concise and realistic.'
      },
      { role: 'user', content: description }
    ],
    stream: false
  };

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${profile.grokApiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`Grok setup error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim() || '';
  try {
    return JSON.parse(text);
  } catch {
    return { targetRole: text };
  }
}

async function callGrokForSuggestions(profile) {
  if (profile.mockMode || !profile.grokApiKey) {
    return [
      { title: 'Senior Full-Stack Engineer', company: 'Remote SaaS', url: 'https://example.com/apply/fullstack' },
      { title: 'Data Engineer', company: 'Fintech Co', url: 'https://example.com/apply/data' }
    ];
  }

  const payload = {
    model: grokModel,
    temperature: 0.25,
    messages: [
      {
        role: 'system',
        content: 'Return 3-5 job suggestions as JSON array of {title, company, url}. Focus on software roles matching the candidate preferences and location.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          targetRole: profile.targetRole,
          targetCompany: profile.targetCompany,
          location: profile.location,
          remotePreference: profile.remotePreference,
          salary: profile.expectedSalaryYearly
        })
      }
    ],
    stream: false
  };

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${profile.grokApiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`Grok suggestion error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim() || '';
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function callGrokChat(profile, question) {
  if (profile.mockMode || !profile.grokApiKey) {
    return 'Mock reply: tailor your answers to the role, keep it concise, and reuse your resume highlights.';
  }
  const payload = {
    model: grokModel,
    temperature: 0.35,
    messages: [
      { role: 'system', content: 'You are an assistant helping a job seeker apply. Be concise, actionable, and first-person.' },
      { role: 'user', content: question }
    ],
    stream: false
  };
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${profile.grokApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Grok chat error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() || 'No reply.';
}

async function callLiveSuggestions(profile) {
  const query = encodeURIComponent(profile.targetRole || profile.desiredTitle || 'software engineer');
  const results = [];

  // Remotive
  try {
    const remotiveUrl = `https://remotive.io/api/remote-jobs?search=${query}`;
    const res = await fetch(remotiveUrl);
    if (res.ok) {
      const data = await res.json();
      const jobs = data.jobs || [];
      jobs.slice(0, 5).forEach(j => {
        if (j.url) results.push({ title: j.title || '', company: j.company_name || '', url: j.url || j.job_url || '' });
      });
    }
  } catch {}

  // RemoteOK
  try {
    const rok = await fetch('https://remoteok.com/api');
    if (rok.ok) {
      const data = await rok.json();
      // First item is metadata
      const jobs = (data || []).slice(1).filter(Boolean);
      jobs.filter(j => {
        const title = (j.position || j.title || '').toLowerCase();
        return title.includes((profile.targetRole || '').toLowerCase()) || title.includes((profile.desiredTitle || '').toLowerCase()) || title.includes('engineer');
      }).slice(0, 5).forEach(j => {
        if (j.url) results.push({ title: j.position || j.title || '', company: j.company || j.company_name || '', url: j.url });
      });
    }
  } catch {}

  // Deduplicate by URL and limit
  const seen = new Set();
  const deduped = [];
  for (const r of results) {
    if (!r.url || seen.has(r.url)) continue;
    seen.add(r.url);
    deduped.push(r);
    if (deduped.length >= 8) break;
  }
  return deduped;
}

function downloadFile(filename, content, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const v = value == null ? '' : String(value);
  if (v.includes(',') || v.includes('"')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'n/a';
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text).catch(() => {});
}

async function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result.split(',')[1];
      resolve({ base64: result, mimeType: file.type, name: file.name });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function persistProfile(profile) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ profile }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}
