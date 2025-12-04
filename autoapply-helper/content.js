chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PREFILL_FORM') {
    prefillPage();
  }
});

function prefillPage() {
  chrome.storage.sync.get('profile', (data) => {
    if (!data.profile) {
      alert('No AutoApply profile found. Please configure settings in the extension.');
      return;
    }

    const profile = data.profile;
    const fields = document.querySelectorAll('input, textarea, select');

    fields.forEach(field => {
      if (field.value && field.value.trim().length > 0) return;

      const hint = buildHintString(field);
      const value = mapHintToValue(hint, profile);

      if (value) fillField(field, value);
    });
  });
}

function buildHintString(field) {
  const parts = [
    field.name || '',
    field.id || '',
    field.placeholder || '',
    getLabelTextForField(field)
  ];
  return parts.join(' ').toLowerCase();
}

function getLabelTextForField(field) {
  if (field.id) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) return label.textContent;
  }

  let parent = field.parentElement;
  while (parent && parent.tagName !== 'FORM') {
    if (parent.tagName === 'LABEL') return parent.textContent;
    parent = parent.parentElement;
  }

  return '';
}

function mapHintToValue(hint, profile) {
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
  if (hint.includes('email')) return profile.email;
  if (hint.includes('phone') || hint.includes('mobile')) return profile.phone;
  if (hint.includes('linkedin')) return profile.linkedinUrl;
  if (hint.includes('portfolio') || hint.includes('website') || hint.includes('personal site') || hint.includes('github')) return profile.portfolioUrl;
  if (hint.includes('resume') && !hint.includes('summary')) return profile.resumeUrl;
  if (hint.includes('location') || hint.includes('city')) return profile.location;
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
  if (field.tagName === 'SELECT') {
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
  }
}
