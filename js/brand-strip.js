// Duplicate the sequence for seamless marquee and enable prefers-reduced-motion
(function(){
  document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll('.brand-track').forEach(track=>{
      const seq = track.querySelector('.brand-seq');
      if(seq){
        const clone = seq.cloneNode(true);
        clone.setAttribute('aria-hidden','true');
        track.appendChild(clone);
      }
      // Respect reduced motion
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        track.style.animation = 'none';
      }
    });
  });
})();
