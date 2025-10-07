// Trading animation elements
document.addEventListener('DOMContentLoaded', function () {
  const bg = document.querySelector('.trading-bg-anim');
  if (!bg) return;
  // Store references for later intersection check
  const candles = [];
  const trendlines = [];
  // Add floating candlesticks with wicks
  for (let i = 0; i < 14; i++) {
    const candle = document.createElement('div');
    candle.className = 'candlestick' + (i % 2 === 0 ? ' red' : '');
    candle.style.left = (10 + Math.random() * 80) + 'vw';
    candle.style.animationDelay = (Math.random() * 7) + 's';
    // Candle body height
    const bodyHeight = 24 + Math.random() * 36;
    candle.style.height = bodyHeight + 'px';
    // Wick lengths
    const wickTopLen = 8 + Math.random() * 12;
    const wickBotLen = 8 + Math.random() * 12;
    // Top wick
    const wickTop = document.createElement('div');
    wickTop.className = 'wick wick-top';
    wickTop.style.height = wickTopLen + 'px';
    wickTop.style.top = '-' + wickTopLen + 'px';
    candle.appendChild(wickTop);
    // Bottom wick
    const wickBot = document.createElement('div');
    wickBot.className = 'wick wick-bottom';
    wickBot.style.height = wickBotLen + 'px';
    wickBot.style.bottom = '-' + wickBotLen + 'px';
    candle.appendChild(wickBot);
    bg.appendChild(candle);
    candles.push(candle);
  }
  // Add animated trendlines
  for (let i = 0; i < 6; i++) {
    const line = document.createElement('div');
    line.className = 'trendline';
    line.style.top = (20 + Math.random() * 60) + 'vh';
    line.style.animationDelay = (Math.random() * 10) + 's';
    bg.appendChild(line);
    trendlines.push(line);
  }

  // Intersection detection and dollar sign effect
  function checkIntersections() {
    // Only remove dollar signs that have finished their animation
    bg.querySelectorAll('.dollar-sign').forEach(e => {
      if (e.dataset.animDone === '1') e.remove();
    });
    // For each candle, check if it overlaps any trendline
    candles.forEach(candle => {
      const cRect = candle.getBoundingClientRect();
      trendlines.forEach(line => {
        const lRect = line.getBoundingClientRect();
        // Check vertical overlap (trendline crosses candle body)
        if (
          cRect.left < lRect.right &&
          cRect.right > lRect.left &&
          cRect.top < lRect.bottom &&
          cRect.bottom > lRect.top
        ) {
          // Place a dollar sign at the intersection (center of overlap)
          const dollar = document.createElement('div');
          dollar.className = 'dollar-sign';
          dollar.innerHTML = '<i class="fa-solid fa-dollar-sign"></i>';
          dollar.style.position = 'absolute';
          dollar.style.left = ((Math.max(cRect.left, lRect.left) + Math.min(cRect.right, lRect.right)) / 2 - bg.getBoundingClientRect().left - 10) + 'px';
          dollar.style.top = ((Math.max(cRect.top, lRect.top) + Math.min(cRect.bottom, lRect.bottom)) / 2 - bg.getBoundingClientRect().top - 10) + 'px';
          dollar.style.fontSize = '26px';
          dollar.style.color = '#fbbf24';
          dollar.style.textShadow = '0 0 8px #fbbf24cc, 0 0 16px #fff8';
          dollar.style.pointerEvents = 'none';
          dollar.style.zIndex = 10;
          dollar.style.animation = 'dollar-float 2.2s cubic-bezier(.4,1.4,.6,1) forwards';
          bg.appendChild(dollar);
          // Remove after animation ends
          dollar.addEventListener('animationend', () => {
            dollar.dataset.animDone = '1';
          });
        }
      });
    });
  }
  setInterval(checkIntersections, 120);
});
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('loginForm');
  const message = document.getElementById('loginMessage');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    message.textContent = '';
    const email = form.email.value.trim();
    const password = form.password.value;

    // Demo validation (replace with real auth in production)
    if (!email || !password) {
      message.textContent = 'Please enter both email and password.';
      return;
    }
    if (email === 'demo@topc.com' && password === 'password123') {
      message.style.color = '#22c55e';
      message.textContent = 'Login successful! Redirecting...';
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1200);
    } else {
      message.style.color = '#ef4444';
      message.textContent = 'Invalid email or password.';
    }
  });
});
