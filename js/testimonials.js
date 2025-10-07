// Horizontal scroll controls for testimonial cards
(function(){
  const scroller = document.querySelector('#reviewsScroller');
  const prev = document.querySelector('#reviewsPrev');
  const next = document.querySelector('#reviewsNext');
  if(!scroller) return;
  function scrollByDelta(dir){
    const delta = Math.min(800, scroller.clientWidth * 0.9);
    scroller.scrollBy({left: dir * delta, behavior:'smooth'});
  }
  prev && prev.addEventListener('click', ()=>scrollByDelta(-1));
  next && next.addEventListener('click', ()=>scrollByDelta(1));
})();
