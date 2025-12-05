window.addEventListener('load', () => {
  const navButtons = document.querySelectorAll('.nav-button');
  const sections = document.querySelectorAll('.section');

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetSection = button.dataset.section;
      
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      sections.forEach(section => section.classList.remove('active'));
      const target = document.getElementById(targetSection);
      if (target) target.classList.add('active');
    });
  });
});
