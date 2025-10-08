// Shared nav drawer toggle for all pages
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const navTrigger = document.getElementById('navTrigger');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const drawerPanel = document.getElementById('drawerPanel');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');
    const open = ()=>{ if(!drawerOverlay||!drawerPanel) return; drawerOverlay.classList.remove('hidden'); drawerPanel.classList.remove('translate-x-full'); document.body.classList.add('overflow-hidden'); };
    const close = ()=>{ if(!drawerOverlay||!drawerPanel) return; drawerOverlay.classList.add('hidden'); drawerPanel.classList.add('translate-x-full'); document.body.classList.remove('overflow-hidden'); };
    navTrigger&&navTrigger.addEventListener('click', open);
    drawerCloseBtn&&drawerCloseBtn.addEventListener('click', close);
    drawerOverlay&&drawerOverlay.addEventListener('click', close);
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });

    // Hide login button if user is logged in
    const token = localStorage.getItem("token");
    if (token) {
        const loginLinks = document.querySelectorAll('a[href="login.html"]');
        loginLinks.forEach(link => link.style.display = 'none');
    }
  });
})();
