// Simple FAQ interactivity: accordion + search filter + section expand/collapse
(function(){
  const list = document.querySelector('.faq-list');

  // Toggle single item
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.faq-q');
    if(btn){
      const item = btn.closest('.faq-item');
      if(item){
        item.classList.toggle('open');
      }
    }
    const toggleAll = e.target.closest('.faq-toggle-all');
    if(toggleAll){
      const section = toggleAll.closest('.faq-section');
      if(!section) return;
      const items = Array.from(section.querySelectorAll('.faq-item'));
      const expanding = toggleAll.textContent.toLowerCase().includes('expand');
      items.forEach(it=>it.classList.toggle('open', expanding));
      toggleAll.textContent = expanding ? 'Collapse all' : 'Expand all';
    }
  });

  // Search filter
  const input = document.getElementById('faqSearch');
  if(input){
    const items = Array.from(document.querySelectorAll('.faq-item'));
    input.addEventListener('input', ()=>{
      const q = input.value.trim().toLowerCase();
      items.forEach(it=>{
        const text = it.textContent.toLowerCase();
        const match = !q || text.includes(q);
        it.style.display = match ? '' : 'none';
        const qEl = it.querySelector('.q-text');
        if(qEl){
          qEl.classList.toggle('faq-highlight', !!q && match);
        }
      });
    });
  }
})();
