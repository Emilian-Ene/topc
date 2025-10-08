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
    // Divide the vertical space (from 20vh to 80vh) into 6 slots.
    // Place one trendline randomly within each slot to prevent them from overlapping.
    const slotHeight = (80 - 20) / 6; // = 10vh per slot
    const topPosition = 20 + (i * slotHeight) + (Math.random() * (slotHeight - 2)); // -2 for padding
    line.style.top = topPosition + 'vh';
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
  const cardContainer = document.querySelector('.card-container');
  const signupLink = document.querySelector('.signup-link');
  const forgotLink = document.querySelector('.forgot-password-link');
  const signinLinks = document.querySelectorAll('.signin-link');
  const signupCard = document.querySelector('.signup-card');
  const forgotCard = document.querySelector('.forgot-card');

  signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupCard.style.zIndex = 3;
    forgotCard.style.zIndex = 1;
    cardContainer.classList.add('is-flipped-signup');
  });

  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotCard.style.zIndex = 3;
    signupCard.style.zIndex = 1;
    cardContainer.classList.add('is-flipped-forgot');
  });

  signinLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      cardContainer.classList.remove('is-flipped-signup', 'is-flipped-forgot');
    });
  });

  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const forgotForm = document.getElementById('forgotForm');

  const loginMessage = document.getElementById('loginMessage');
  const signupMessage = document.getElementById('signupMessage');
  const forgotMessage = document.getElementById('forgotMessage');
  const googleSignInBtn = document.getElementById('googleSignInBtn');

  function handleGoogleSignIn(response) {
    const id_token = response.credential;
    fetch('http://localhost:5000/api/auth/google-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: id_token }),
    })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem('token', data.token);
        window.location.href = 'dashboard.html';
      } else {
        loginMessage.style.color = '#ef4444';
        loginMessage.textContent = data.msg || 'Google Sign-In failed.';
      }
    })
    .catch(err => {
      loginMessage.style.color = '#ef4444';
      loginMessage.textContent = 'Server error. Please try again later.';
    });
  }

  window.onload = function () {
    google.accounts.id.initialize({
      client_id: "942031919347-e8s4tfff8c4iipctrj34lkeqv01m2jv1.apps.googleusercontent.com",
      callback: handleGoogleSignIn
    });
    google.accounts.id.renderButton(
      googleSignInBtn,
      { theme: "filled_blue", size: "large", shape: "pill", text: "signin_with" }
    );
    google.accounts.id.prompt();
  }


  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    loginMessage.textContent = '';
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    if (!email || !password) {
      loginMessage.textContent = 'Please enter both email and password.';
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        loginMessage.style.color = '#ef4444';
        loginMessage.textContent = data.msg || 'Login failed.';
      } else {
        loginMessage.style.color = '#22c55e';
        loginMessage.textContent = 'Login successful! Redirecting...';
        localStorage.setItem('token', data.token);
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1200);
      }
    } catch (err) {
      loginMessage.style.color = '#ef4444';
      loginMessage.textContent = 'Server error. Please try again later.';
    }
  });

  signupForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    signupMessage.textContent = '';
    const email = signupForm.email.value.trim();
    const password = signupForm.password.value;

    if (!email || !password) {
      signupMessage.textContent = 'Please fill out all fields.';
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        signupMessage.style.color = '#ef4444';
        signupMessage.textContent = data.msg || 'Registration failed.';
      } else {
        signupMessage.style.color = '#22c55e';
        signupMessage.textContent = 'Account created successfully! Please sign in.';
        setTimeout(() => {
          cardContainer.classList.remove('is-flipped-signup');
        }, 2000);
      }
    } catch (err) {
      signupMessage.style.color = '#ef4444';
      signupMessage.textContent = 'Server error. Please try again later.';
    }
  });

  // Real-time password checklist for signup
  const signupPw = document.getElementById('signup-password');
  const checklist = document.getElementById('pwChecklist');
  if (signupPw && checklist) {
    const ruleEls = {
      len: checklist.querySelector('[data-rule="len"]'),
      lower: checklist.querySelector('[data-rule="lower"]'),
      upper: checklist.querySelector('[data-rule="upper"]'),
      digit: checklist.querySelector('[data-rule="digit"]'),
      symbol: checklist.querySelector('[data-rule="symbol"]')
    };
    function updatePwRules() {
      const v = signupPw.value;
      const tests = {
        len: v.length >= 8,
        lower: /[a-z]/.test(v),
        upper: /[A-Z]/.test(v),
        digit: /[0-9]/.test(v),
        symbol: /[^A-Za-z0-9]/.test(v)
      };
      Object.entries(tests).forEach(([k, ok]) => {
        const el = ruleEls[k];
        if (!el) return;
        el.style.color = ok ? '#22c55e' : '#64748b';
        el.style.textDecoration = ok ? 'none' : 'none';
        el.innerHTML = `${ok ? '✔' : '•'} ${el.textContent.replace(/^✔?\s?/, '')}`;
      });
    }
    signupPw.addEventListener('input', updatePwRules);
    updatePwRules();
  }

  forgotForm.addEventListener('submit', function (e) {
    e.preventDefault();
    forgotMessage.textContent = '';
    const email = forgotForm.email.value.trim();

    if (!email) {
      forgotMessage.textContent = 'Please enter your email address.';
      return;
    }
    // Demo success message
    forgotMessage.style.color = '#22c55e';
    forgotMessage.textContent = 'Password reset link sent to your email.';
    setTimeout(() => {
        cardContainer.classList.remove('is-flipped-forgot');
    }, 2000);
  });
});
