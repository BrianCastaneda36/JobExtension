const defaultProfile = {
  fullName: "Brian Adam Castaneda",
  email: "brian.adam.castaneda@gmail.com",
  phone: "+1 (727) 404-7175",
  location: "Tampa, FL (open to remote from Colombia and LATAM in US time zones)",
  linkedinUrl: "https://www.linkedin.com/in/brian-castaneda-405880170",
  portfolioUrl: "https://briancastaneda.dev",
  resumeUrl: "https://your-resume-link-here.com",
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

const fields = [
  'fullName', 'email', 'phone', 'location', 'linkedinUrl', 'portfolioUrl',
  'desiredTitle', 'expectedSalaryYearly', 'expectedSalaryHourly', 'availability',
  'workAuthorization', 'aboutYou', 'whyThisRoleTemplate', 'strengths', 'remotePreference'
];

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get('profile', (data) => {
    const profile = data.profile || defaultProfile;
    
    if (!data.profile) {
      chrome.storage.sync.set({ profile: defaultProfile });
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
});
