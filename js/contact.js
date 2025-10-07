// Simple client-side contact form handling (no backend)
(function(){
  document.addEventListener('DOMContentLoaded', ()=>{
    const form = document.getElementById('contactForm');
    const box = document.getElementById('contactSuccess');
    if(!form) return;
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      // basic validation
      if(!data.name || !data.email || !data.message){
        alert('Please complete Name, Email and Message.');
        return;
      }
      try {
        const list = JSON.parse(localStorage.getItem('contact_messages')||'[]');
        list.push({...data, ts: Date.now()});
        localStorage.setItem('contact_messages', JSON.stringify(list));
      } catch(err) {}
      form.reset();
      if(box){
        box.classList.add('show');
        box.focus();
        setTimeout(()=>box.classList.remove('show'), 4000);
      }
    });
  });
})();
