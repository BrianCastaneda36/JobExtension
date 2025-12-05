function getDefaultProfile() {
  return {
    fullName: "Brian Adam Castaneda",
    email: "brian.adam.castaneda@gmail.com",
    phone: "+1 (727) 404-7175",
    location: "Orlando, FL",
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
    emphasizeKeywords: true,
    mockMode: false,
    grokLastGeneratedAt: "",
    grokLastExtractedAt: "",
    roleBullets: "",
    companySnapshot: "",
    whyUsPoints: "",
    resumeVariants: [],
    activeResumeName: "",
    aboutYou: "I'm a software engineer and data-focused product professional with a background in credit risk, analytics, and automation. I've shipped internal tools, dashboards, and integrations using Python, SQL, Alteryx, and JavaScript/TypeScript that reduce manual work and give teams clearer visibility into their metrics. I enjoy owning problems end-to-end: clarifying requirements with stakeholders, designing a simple architecture, and then implementing, testing, and iterating on real-world feedback. I'm comfortable working remotely, communicating async, and collaborating across product, engineering, and operations.",
    whyThisRoleTemplate: "I'm excited about the {role} opportunity at {company} because it sits right at the intersection of engineering, data, and real business impact. I enjoy working on products where better tooling, automation, and analytics directly improve user outcomes and company performance. From my experience building internal dashboards, Python tools, and backend integrations, I've seen how much leverage a strong engineering team can create, and I'm looking for a place where I can contribute hands-on, ship quickly, and grow with a remote-first, high-ownership culture like yours.",
    strengths: "My strengths are: (1) turning messy, real-world requirements into clear technical plans and small, shippable pieces; (2) building reliable tools and automation in Python, SQL, and JavaScript that reduce manual work and improve decision-making; and (3) communicating clearly with non-technical stakeholders so we're aligned on outcomes, trade-offs, and timelines. I'm comfortable working independently in a remote environment, asking the right questions early, and taking ownership of results instead of just tickets.",
    remotePreference: "Remote-first, ideally working core hours in US Eastern time. I'm comfortable collaborating asynchronously with distributed teams, and I value clear written communication, well-defined ownership, and a culture that trusts engineers to manage their time and deliver outcomes."
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PREFILL_FORM') {
    prefillPage();
  } else if (message.type === 'DETECT_JOB_INFO') {
    sendResponse(detectJobInfo());
  } else if (message.type === 'SET_TARGET') {
    if (message.targetRole) {
      chrome.storage.sync.get('profile', (data) => {
        const profile = data.profile || getDefaultProfile();
        profile.targetRole = message.targetRole;
        if (message.targetCompany) profile.targetCompany = message.targetCompany;
        chrome.storage.sync.set({ profile });
      });
    }
  }
});

setTimeout(() => {
  const hostname = window.location.hostname;
  const isJobSite = hostname.includes('greenhouse') || hostname.includes('lever') || 
                    hostname.includes('workday') || hostname.includes('jobs') || 
                    hostname.includes('careers') || hostname.includes('apply') ||
                    hostname.includes('linkedin') || hostname.includes('indeed');
  
  if (isJobSite && document.querySelectorAll('input, textarea, select').length > 3) {
    prefillPage();
  }
}, 2000);

function prefillPage() {
  chrome.storage.sync.get('profile', (data) => {
    let profile = data.profile;
    if (!profile) {
      profile = getDefaultProfile();
      chrome.storage.sync.set({ profile });
    }

    // Auto-pick a resume variant based on job title keywords if available
    const jobInfo = detectJobInfo();
    if (profile.resumeVariants && profile.resumeVariants.length > 0) {
      const picked = pickResumeVariant(jobInfo.jobTitle, profile.resumeVariants);
      if (picked) {
        profile.resumeUrl = picked.url;
        profile.activeResumeName = picked.name;
      }
    }

    const fields = document.querySelectorAll('input, textarea, select, button[role="combobox"]');

    const fieldList = Array.from(fields);
    let delay = 0;
    const delayStep = 120 + Math.floor(Math.random() * 120); // small human-like delay per field

    fieldList.forEach(field => {
      setTimeout(() => {
        try {
          if (field.type === 'file') return; // don't try to auto-fill file inputs (e.g., resume upload)
          if (hasMeaningfulValue(field)) return;

          const hint = buildHintString(field);
          const value = mapHintToValue(hint, profile);

          if (value) fillField(field, value);
        } catch (err) {
          // Keep going even if a single field errors (e.g., browser-restricted fields)
          console.warn('Auto-fill skipped field due to error:', err);
        }
      }, delay);
      delay += delayStep;
    });
    
    createJobApplicationEntry();
    setTimeout(() => attachAccessibilityCounters(), 500);
    if (profile.autoSubmitEnabled) {
      const delayMs = Math.max(500, profile.autoSubmitDelay || 1200);
      setTimeout(() => autoSubmitIfSafe(), delayMs);
    }
  });
}

function buildHintString(field) {
  const parts = [
    field.name || '',
    field.id || '',
    field.placeholder || '',
    field.getAttribute('aria-label') || '',
    getLabelTextForField(field)
  ];
  return parts.join(' ').toLowerCase();
}

function getLabelTextForField(field) {
  if (field.id) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) return label.textContent;
    
    const labelById = document.querySelector(`label[id="${field.id}-label"]`);
    if (labelById) return labelById.textContent;
  }

  let parent = field.parentElement;
  while (parent && parent.tagName !== 'FORM') {
    if (parent.tagName === 'LABEL') return parent.textContent;
    parent = parent.parentElement;
  }

  return '';
}

function hasMeaningfulValue(field) {
  // Many job portals pre-seed URL fields with "https://", "https://www." or a bare LinkedIn template.
  // Treat those as empty so we can still inject the real profile/website URLs.
  if (field.tagName === 'BUTTON') return false;

  const value = (field.value || '').trim();
  if (!value) return false;

  const placeholderUrl = /^https?:\/\/(www\.)?$/i;
  const placeholderLinkedIn = /^https?:\/\/(www\.)?linkedin\.com(\/in\/?)?$/i;
  const placeholderBare = /^(www|www\.)$/i;

  return !(placeholderUrl.test(value) || placeholderLinkedIn.test(value) || placeholderBare.test(value));
}

function normalizeText(str) {
  return (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isPreferNot(text) {
  const normalized = normalizeText(text);
  return /prefer not|do not wish|do not want|decline|opt out|not disclose|not specify|not say|decline to state/.test(normalized);
}

function mapHintToValue(hint, profile) {
  if (hint.includes('linkedin') || hint.includes('linked in')) return profile.linkedinUrl;
  if (hint.includes('portfolio') || hint.includes('porfolio') || hint.includes('website') || hint.includes('personal site') || hint.includes('github') || hint.includes('personal website')) return profile.portfolioUrl;
  if (hint.includes('country code') || (hint.includes('country') && hint.includes('code'))) return '+1';
  if (hint.includes('country') && !hint.includes('code')) return 'United States';
  if (hint.includes('disability')) return profile.disabilityStatus;
  if (hint.includes('veteran') || hint.includes('military service') || hint.includes('armed forces')) return profile.veteranStatus;
  if (hint.includes('first name') || hint.includes('firstname') || hint.includes('preferred first name')) {
    return profile.fullName.split(' ')[0];
  }
  if (hint.includes('last name') || hint.includes('lastname') || hint.includes('surname')) {
    const parts = profile.fullName.split(' ');
    return parts[parts.length - 1];
  }
  if (hint.includes('middle name') || hint.includes('middlename')) {
    const parts = profile.fullName.split(' ');
    return parts.length > 2 ? parts[1] : '';
  }
  if (hint.includes('username') || hint.includes('user name')) return profile.username;
  if (hint.includes('password') || hint.includes('confirm password')) return profile.password;
  if (hint.includes('email')) return profile.email;
  if (hint.includes('phone') || hint.includes('mobile')) return profile.phone;
  if (hint.includes('resume') && !hint.includes('summary')) return profile.resumeUrl;
  if (hint.includes('current location') || hint.includes('location') || hint.includes('city')) {
    return profile.location;
  }
  if (hint.includes('authorization') || hint.includes('visa')) return profile.workAuthorization;
  if (hint.includes('availability') || hint.includes('start date') || hint.includes('notice')) return profile.availability;
  if (hint.includes('about yourself') || hint.includes('about you') || hint.includes('tell us about yourself')) return profile.aboutYou;
  if (hint.includes('why do you want') || hint.includes('motivation') || hint.includes('why this role') || hint.includes('why would you like to work')) return profile.whyThisRoleTemplate;
  if (hint.includes('strength') || hint.includes('what are you good at')) return profile.strengths;
  if (hint.includes('remote') || hint.includes('work style') || hint.includes('working style')) return profile.remotePreference;
  if (hint.includes('hourly')) return profile.expectedSalaryHourly;
  if (hint.includes('salary') || hint.includes('compensation') || hint.includes('annual') || hint.includes('yearly')) return profile.expectedSalaryYearly;
  if ((hint.includes('title') || hint.includes('position') || hint.includes('role you are applying')) && !hint.includes('job title')) return profile.desiredTitle;
  if (hint.includes('name') || hint.includes('full name') || hint.includes('your name')) return profile.fullName;

  return null;
}

function fillField(field, value) {
  if (field.tagName === 'BUTTON' && field.getAttribute('role') === 'combobox') {
    field.click();
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]:focus, input[aria-label*="location"], input[placeholder*="location"]');
      if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        
        setTimeout(() => {
          const dropdown = findAutocompleteDropdown(input, value);
          if (dropdown) selectFromDropdown(dropdown, value);
        }, 500);
      } else {
        // Some custom dropdowns are purely click-based.
        const dropdown = findAutocompleteDropdown(field, value);
        if (dropdown) selectFromDropdown(dropdown, value);
      }
    }, 300);
  } else if (field.tagName === 'SELECT') {
    const options = Array.from(field.options);
    let match = options.find(opt => optionMatches(opt, value));
    if (match) {
      field.value = match.value;
      match.selected = true;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else if (field.type === 'radio') {
    selectRadioOption(field, value);
  } else if (field.type === 'number') {
    const numMatch = value.match(/\d+/);
    if (numMatch) field.value = numMatch[0];
  } else {
    let finalValue = value;
    if (field.maxLength && field.maxLength > 0 && finalValue.length > field.maxLength) {
      finalValue = finalValue.slice(0, field.maxLength - 3) + '...';
    }
    field.value = finalValue;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    setTimeout(() => {
      const dropdown = findAutocompleteDropdown(field, value);
      if (dropdown) selectFromDropdown(dropdown, value);
    }, 500);
  }
}

function findAutocompleteDropdown(field, value) {
  const selectors = [
    '[role="listbox"]',
    'ul[role="listbox"]',
    '[role="menu"]',
    '[id*="listbox"]',
    '.autocomplete-dropdown',
    '.dropdown-menu',
    '.Select-menu-outer',
    '[data-radix-collection-root]',
    '[data-automation*="options"]',
    '[data-testid*="options"]',
    'ul[class*="suggest"]',
    'ul[class*="autocomplete"]',
    'div[class*="dropdown"]',
    'ul[class*="options"]'
  ];
  
  for (const selector of selectors) {
    const dropdown = document.querySelector(selector);
    if (dropdown && dropdown.offsetParent !== null) {
      return dropdown;
    }
  }
  
  return null;
}

function selectFromDropdown(dropdown, value) {
  const items = dropdown.querySelectorAll('[role="option"], li, div[class*="option"]');
  
  for (const item of items) {
    const text = item.textContent || '';
    const dataValue = item.getAttribute('data-value') || '';
    if (optionMatches({ textContent: text, value: dataValue }, value)) {
      item.click();
      item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      break;
    }
  }
}

function optionMatches(option, desiredValue) {
  const rawOptionText = typeof option === 'string'
    ? option
    : (option.text || option.textContent || option.getAttribute?.('data-value') || option.value || '');
  const rawOptionValue = typeof option === 'string'
    ? option
    : (option.value || option.getAttribute?.('data-value') || rawOptionText);

  const optText = normalizeText(rawOptionText);
  const optValue = normalizeText(rawOptionValue);
  const desired = normalizeText(desiredValue);

  if (!desired) return false;
  if (optText === desired || optValue === desired) return true;
  if (optText.includes(desired) || optValue.includes(desired)) return true;
  if (isPreferNot(desired) && isPreferNot(optText)) return true;

  // Special handling for country code and US variants
  if (desired === '+1' && (optValue === '+1' || optValue === '1' || optText.includes('united states') || optText.includes('usa'))) {
    return true;
  }
  if (desired === 'united states' && (optText.includes('united states') || optText.includes('usa') || optValue === 'us' || optValue === 'usa')) {
    return true;
  }

  return false;
}

function selectRadioOption(field, desiredValue) {
  const desired = normalizeText(desiredValue);
  if (!field.name) return;

  const group = Array.from(document.querySelectorAll(`input[type="radio"][name="${field.name}"]`));
  for (const radio of group) {
    const labelText = getLabelTextForField(radio);
    const radioValue = radio.value || '';

    if (!desired) continue;
    if (optionMatches({ textContent: labelText, value: radioValue }, desiredValue)) {
      if (!radio.checked) {
        radio.checked = true;
        radio.dispatchEvent(new Event('input', { bubbles: true }));
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        radio.dispatchEvent(new Event('click', { bubbles: true }));
      }
      break;
    }
  }
}

function detectJobInfo() {
  const hostname = window.location.hostname;
  const url = window.location.href;
  
  let company = extractCompanyFromHostname(hostname);
  let jobTitle = extractJobTitle();
  let source = extractSource(hostname);
  
  return { company, jobTitle, source, url };
}

function extractCompanyFromHostname(hostname) {
  const companyEl = document.querySelector('[class*="company"]');
  if (companyEl) return companyEl.textContent.trim();
  
  const parts = hostname.replace('www.', '').split('.');
  if (parts.includes('greenhouse') || parts.includes('lever') || parts.includes('workday')) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  
  const mainDomain = parts[parts.length - 2];
  return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
}

function extractJobTitle() {
  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent.match(/engineer|developer|manager|designer|analyst|specialist/i)) {
    return h1.textContent.trim();
  }
  
  const title = document.title;
  const match = title.match(/(.+?)\s*[--|]/);
  return match ? match[1].trim() : title.split('-')[0].trim();
}

function extractSource(hostname) {
  if (hostname.includes('linkedin')) return 'LinkedIn';
  if (hostname.includes('indeed')) return 'Indeed';
  if (hostname.includes('greenhouse')) return 'Greenhouse';
  if (hostname.includes('lever')) return 'Lever';
  if (hostname.includes('workday')) return 'Workday';
  if (hostname.includes('jobs.')) return 'Company Site';
  return 'Direct';
}

async function createJobApplicationEntry() {
  const jobInfo = detectJobInfo();

  chrome.storage.sync.get(['jobApplications', 'profile'], (data) => {
    const profile = data.profile || getDefaultProfile();
    const salaryEstimate = buildSalaryEstimate(profile);
    const appliedAt = new Date().toISOString();
    const followUpDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const newApp = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      company: jobInfo.company,
      jobTitle: jobInfo.jobTitle,
      source: jobInfo.source,
      location: profile.location || '',
      salaryExpectation: salaryEstimate.display || profile.expectedSalaryYearly || '',
      salaryLocation: salaryEstimate.locationUsed || profile.location || '',
      remotePreference: profile.remotePreference || '',
      appliedAt,
      followUpDue,
      followUpDone: false,
      status: 'APPLIED',
      lastStatusUpdate: new Date().toISOString(),
      notes: '',
      localNotes: '',
      url: jobInfo.url
    };
    
    const apps = data.jobApplications || [];
    const exists = apps.find(a => {
      const sameUrl = a.url === newApp.url;
      const sameRole = (a.company || '').toLowerCase() === (newApp.company || '').toLowerCase() &&
                       (a.jobTitle || '').toLowerCase() === (newApp.jobTitle || '').toLowerCase();
      const sameDomain = (() => {
        try {
          const existingHost = new URL(a.url || '').hostname.replace('www.', '');
          const newHost = new URL(newApp.url || '').hostname.replace('www.', '');
          return existingHost && newHost && existingHost === newHost;
        } catch {
          return false;
        }
      })();
      return sameUrl || sameRole || (sameDomain && sameRole);
    });
    
    if (!exists) {
      apps.push(newApp);
      chrome.storage.sync.set({ jobApplications: apps });
    }
  });
}

function buildSalaryEstimate(profile) {
  const raw = profile.expectedSalaryYearly || '';
  const numbers = (raw.match(/\d[\d,]*/g) || []).map(n => parseInt(n.replace(/,/g, ''), 10)).filter(Boolean);
  if (numbers.length === 0) return { display: raw, locationUsed: profile.location || '' };
  let low = Math.min(...numbers);
  let high = Math.max(...numbers);

  const loc = (profile.location || '').toLowerCase();
  const factors = {
    'new york': 1.2,
    'san francisco': 1.25,
    'bay area': 1.25,
    'seattle': 1.15,
    'miami': 1.05,
    'austin': 1.05,
    'boston': 1.1,
    'tampa': 0.95,
    'orlando': 1.0,
    'remote': 1.0
  };

  const matchKey = Object.keys(factors).find(k => loc.includes(k));
  const factor = matchKey ? factors[matchKey] : 1.0;
  low = Math.round(low * factor);
  high = Math.round(high * factor);

  const display = `$${low.toLocaleString()} - $${high.toLocaleString()}`;
  return { display, locationUsed: profile.location || '' };
}

function pickResumeVariant(jobTitle, variants) {
  if (!jobTitle || !variants?.length) return null;
  const title = jobTitle.toLowerCase();
  const scored = variants.map(v => {
    const name = (v.name || '').toLowerCase();
    let score = 0;
    if (title.includes('data') && name.includes('data')) score += 2;
    if ((title.includes('manager') || title.includes('lead')) && name.includes('manager')) score += 2;
    if (title.includes('full') && name.includes('full')) score += 2;
    if (title.includes('backend') && name.includes('back')) score += 1;
    if (title.includes('front') && name.includes('front')) score += 1;
    if (title.includes('ml') || title.includes('ai') || title.includes('machine')) {
      if (name.includes('ml') || name.includes('ai')) score += 2;
    }
    return { v, score };
  }).sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].v : null;
}

function autoSubmitIfSafe() {
  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button[data-testid*="submit"]',
    'button[data-testid*="apply"]',
    'button[id*="submit"]',
    'button[id*="apply"]',
    'button[class*="submit"]',
    'button[class*="apply"]'
  ];
  let candidate = null;
  for (const sel of submitSelectors) {
    const btn = document.querySelector(sel);
    if (btn) { candidate = btn; break; }
  }
  if (!candidate) {
    const buttons = Array.from(document.querySelectorAll('button'));
    candidate = buttons.find(b => {
      const txt = (b.textContent || '').toLowerCase();
      return /apply|submit|send/.test(txt);
    });
  }
  if (candidate && !candidate.dataset.jsproClicked) {
    candidate.dataset.jsproClicked = 'true';
    candidate.click();
  }
}

// ----------------------------
// Accessibility helpers + palette
// ----------------------------
function attachAccessibilityCounters() {
  const fields = document.querySelectorAll('textarea[maxlength], input[maxlength]');
  fields.forEach(field => {
    if (field.dataset.jsproCounterAttached) return;
    const max = parseInt(field.getAttribute('maxlength'), 10);
    if (!max || Number.isNaN(max)) return;
    const badge = document.createElement('span');
    badge.textContent = `${(field.value || '').length}/${max}`;
    badge.style.position = 'absolute';
    badge.style.right = '6px';
    badge.style.bottom = '6px';
    badge.style.fontSize = '11px';
    badge.style.color = '#94a3b8';
    badge.style.background = 'rgba(15,23,42,0.9)';
    badge.style.border = '1px solid #1e293b';
    badge.style.borderRadius = '8px';
    badge.style.padding = '2px 6px';
    badge.style.pointerEvents = 'none';
    badge.style.zIndex = '2147483647';
    badge.className = 'jspro-counter';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    field.parentNode.insertBefore(wrapper, field);
    wrapper.appendChild(field);
    wrapper.appendChild(badge);

    const update = () => {
      badge.textContent = `${(field.value || '').length}/${max}`;
    };
    field.addEventListener('input', update);
    field.dataset.jsproCounterAttached = 'true';
  });
}

let paletteRoot = null;
function ensureCommandPalette(profile) {
  if (paletteRoot) return paletteRoot;
  paletteRoot = document.createElement('div');
  paletteRoot.id = 'jspro-palette-root';
  Object.assign(paletteRoot.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '320px',
    background: '#0f172a',
    color: '#e5e7eb',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
    padding: '12px',
    fontFamily: 'system-ui, sans-serif',
    display: 'none',
    zIndex: '2147483647'
  });

  paletteRoot.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <strong style="font-size:14px;">JobSeeker Pro+ Palette</strong>
      <button id="jspro-close" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;">×</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
      <button class="jspro-action" data-action="prefill">Prefill this page</button>
      <button class="jspro-action" data-action="open-settings">Open settings</button>
      <button class="jspro-action" data-action="open-tracker">Open tracker</button>
      <button class="jspro-action" data-action="copy-availability">Copy availability snippet</button>
      <button class="jspro-action" data-action="copy-relocation">Copy relocation snippet</button>
    </div>
  `;

  paletteRoot.querySelectorAll('.jspro-action').forEach(btn => {
    Object.assign(btn.style, {
      padding: '8px 10px',
      background: '#111827',
      border: '1px solid #1f2937',
      borderRadius: '8px',
      color: '#e5e7eb',
      cursor: 'pointer',
      textAlign: 'left'
    });
    btn.addEventListener('mouseenter', () => btn.style.borderColor = '#2563eb');
    btn.addEventListener('mouseleave', () => btn.style.borderColor = '#1f2937');
  });

  paletteRoot.querySelector('#jspro-close').addEventListener('click', () => togglePalette(false));
  document.body.appendChild(paletteRoot);
  return paletteRoot;
}

function togglePalette(forceState) {
  if (!paletteRoot) return;
  const next = forceState !== undefined ? forceState : paletteRoot.style.display === 'none';
  paletteRoot.style.display = next ? 'block' : 'none';
}

function handlePaletteActions(profile) {
  ensureCommandPalette(profile);
  paletteRoot.addEventListener('click', async (e) => {
    const btn = e.target.closest('.jspro-action');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'prefill') {
      prefillPage();
    } else if (action === 'open-settings') {
      chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
    } else if (action === 'open-tracker') {
      chrome.runtime.sendMessage({ type: 'OPEN_TRACKER' });
    } else if (action === 'copy-availability') {
      navigator.clipboard?.writeText(profile.availabilitySnippet || profile.availability || '').catch(() => {});
    } else if (action === 'copy-relocation') {
      navigator.clipboard?.writeText(profile.relocationSnippet || 'Open to relocate; remote preferred aligned to US Eastern.').catch(() => {});
    }
    togglePalette(false);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
    chrome.storage.sync.get('profile', (data) => {
      const profile = data.profile || getDefaultProfile();
      ensureCommandPalette(profile);
      handlePaletteActions(profile);
      togglePalette();
    });
  }
});
