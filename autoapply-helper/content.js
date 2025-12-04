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
    expectedSalaryYearly: "$105,000 – $135,000 USD (flexible based on level, scope, and benefits)",
    expectedSalaryHourly: "$55 – $70/hr USD (flexible based on project and duration)",
    workAuthorization: "US citizen, authorized to work for US employers. Open to fully remote roles while residing in Colombia, aligned to US Eastern time.",
    availability: "Currently employed; available to start within 2–3 weeks of offer. Open to discussing earlier or phased start if needed.",
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

    const fields = document.querySelectorAll('input, textarea, select, button[role="combobox"]');

    fields.forEach(field => {
      if (hasMeaningfulValue(field)) return;

      const hint = buildHintString(field);
      const value = mapHintToValue(hint, profile);

      if (value) fillField(field, value);
    });
    
    createJobApplicationEntry();
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

function mapHintToValue(hint, profile) {
  if (hint.includes('linkedin') || hint.includes('linked in')) return profile.linkedinUrl;
  if (hint.includes('portfolio') || hint.includes('porfolio') || hint.includes('website') || hint.includes('personal site') || hint.includes('github') || hint.includes('personal website')) return profile.portfolioUrl;
  if (hint.includes('country code') || (hint.includes('country') && hint.includes('code'))) return '+1';
  if (hint.includes('country') && !hint.includes('code')) return 'United States';
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
      }
    }, 300);
  } else if (field.tagName === 'SELECT') {
    const options = Array.from(field.options);
    let match = options.find(opt => 
      opt.value === value || 
      opt.text === value ||
      opt.text.toLowerCase().includes(value.toLowerCase()) ||
      (value === '+1' && (opt.value === '+1' || opt.value === '1' || opt.text.includes('United States') || opt.text.includes('USA'))) ||
      (value === 'United States' && (opt.text.includes('United States') || opt.text.includes('USA') || opt.value === 'US' || opt.value === 'USA'))
    );
    if (match) {
      field.value = match.value;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else if (field.type === 'number') {
    const numMatch = value.match(/\d+/);
    if (numMatch) field.value = numMatch[0];
  } else {
    field.value = value;
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
    '[role="menu"]',
    '.autocomplete-dropdown',
    '.dropdown-menu',
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
  const valueLower = value.toLowerCase();
  const cityName = value.split(',')[0].trim().toLowerCase();
  
  for (const item of items) {
    const text = item.textContent.toLowerCase().trim();
    if (text.includes(valueLower) || text.includes(cityName)) {
      item.click();
      item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
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
  const match = title.match(/(.+?)\s*[-–|]/);
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
  
  const newApp = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    company: jobInfo.company,
    jobTitle: jobInfo.jobTitle,
    source: jobInfo.source,
    location: '',
    appliedAt: new Date().toISOString(),
    status: 'APPLIED',
    lastStatusUpdate: new Date().toISOString(),
    notes: '',
    url: jobInfo.url
  };
  
  chrome.storage.sync.get('jobApplications', (data) => {
    const apps = data.jobApplications || [];
    const exists = apps.find(a => 
      a.url === newApp.url || 
      (a.company === newApp.company && a.jobTitle === newApp.jobTitle)
    );
    
    if (!exists) {
      apps.push(newApp);
      chrome.storage.sync.set({ jobApplications: apps });
    }
  });
}
