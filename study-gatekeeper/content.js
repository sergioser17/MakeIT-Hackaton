(function () {
  if (document.getElementById('sg-dopamine-timer')) return;

  chrome.runtime.sendMessage({ type: 'GET_TIMER_DURATION' }, (response) => {
    const remainingMs = response?.remainingMs || 5 * 60 * 1000;
    const endTime = Date.now() + remainingMs;

    const timer = document.createElement('div');
    timer.id = 'sg-dopamine-timer';
    Object.assign(timer.style, {
      position: 'fixed',
      top: '18px',
      right: '18px',
      zIndex: '999999',
      background: 'rgba(18, 18, 24, 0.88)',
      color: '#f472b6',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'SF Mono', monospace",
      fontSize: '15px',
      fontWeight: '700',
      padding: '8px 14px',
      borderRadius: '9999px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(244, 114, 182, 0.25)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'default',
      userSelect: 'none',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)'
    });

    const statusDot = document.createElement('span');
    Object.assign(statusDot.style, {
      width: '8px',
      height: '8px',
      borderRadius: '9999px',
      background: '#ec4899',
      boxShadow: '0 0 8px #ec4899'
    });

    const timeDisplay = document.createElement('span');
    timeDisplay.id = 'sg-time-display';
    timeDisplay.style.letterSpacing = '0.5px';
    timeDisplay.style.color = '#fbcfe8';

    const endBtn = document.createElement('button');
    endBtn.id = 'sg-end-btn';
    endBtn.textContent = 'End Break';
    Object.assign(endBtn.style, {
      background: 'rgba(236, 72, 153, 0.15)',
      color: '#f472b6',
      border: '1px solid rgba(236, 72, 153, 0.35)',
      fontSize: '11px',
      fontWeight: '600',
      padding: '4px 10px',
      borderRadius: '9999px',
      cursor: 'pointer',
      marginLeft: '4px',
      transition: 'all 0.2s ease',
      display: 'inline-flex',
      alignItems: 'center',
      outline: 'none'
    });

    endBtn.addEventListener('mouseenter', () => {
      endBtn.style.background = '#ec4899';
      endBtn.style.color = '#ffffff';
      endBtn.style.boxShadow = '0 0 15px rgba(236, 72, 153, 0.5)';
      endBtn.style.transform = 'scale(1.04)';
    });
    endBtn.addEventListener('mouseleave', () => {
      endBtn.style.background = 'rgba(236, 72, 153, 0.15)';
      endBtn.style.color = '#f472b6';
      endBtn.style.boxShadow = 'none';
      endBtn.style.transform = 'scale(1)';
    });

    endBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      terminateSession();
    });

    timer.appendChild(statusDot);
    timer.appendChild(timeDisplay);
    timer.appendChild(endBtn);
    document.body.appendChild(timer);

    timer.addEventListener('mouseenter', () => {
      timer.style.boxShadow = '0 12px 35px rgba(236, 72, 153, 0.25), 0 0 0 1px rgba(244, 114, 182, 0.45)';
    });
    timer.addEventListener('mouseleave', () => {
      timer.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(244, 114, 182, 0.25)';
    });

    function formatTime(ms) {
      const totalSec = Math.max(0, Math.ceil(ms / 1000));
      const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const s = String(totalSec % 60).padStart(2, '0');
      return `${m}:${s}`;
    }

    function tick() {
      const remaining = endTime - Date.now();

      if (remaining <= 0) {
        timeDisplay.textContent = '00:00';
        clearInterval(interval);
        terminateSession();
        return;
      }

      timeDisplay.textContent = formatTime(remaining);

      if (remaining <= 60000) {
        timer.style.boxShadow = '0 0 25px rgba(244, 63, 94, 0.4), 0 0 0 1px rgba(244, 63, 94, 0.5)';
        timeDisplay.style.color = '#fda4af';
      }

      if (remaining <= 10000) {
        timer.style.animation = 'sg-pulse 0.5s ease-in-out infinite';
      }
    }

    const style = document.createElement('style');
    style.textContent = `
      @keyframes sg-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.04); }
      }
    `;
    document.head.appendChild(style);

    tick();
    const interval = setInterval(tick, 1000);

    function terminateSession() {
      clearInterval(interval);
      chrome.runtime.sendMessage({ type: 'END_BREAK_NOW' }, () => {
        timeIsUp();
      });
    }

    function timeIsUp() {
      try {
        window.close();
      } catch {}

      setTimeout(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        Object.assign(document.body.style, {
          margin: '0',
          padding: '0',
          background: '#09090b',
          color: '#f43f5e',
          fontFamily: "'Inter', system-ui, sans-serif",
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '12px'
        });

        const pill = document.createElement('div');
        pill.textContent = 'FOCUS SESSION';
        Object.assign(pill.style, {
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '2px',
          padding: '4px 12px',
          borderRadius: '9999px',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          color: '#fda4af'
        });

        const heading = document.createElement('h1');
        heading.textContent = "Time's up. Back to work.";
        Object.assign(heading.style, {
          fontSize: '44px',
          fontWeight: '900',
          letterSpacing: '-1px',
          color: '#ffffff'
        });

        const sub = document.createElement('p');
        sub.textContent = 'Your break has concluded. Return to your studies.';
        Object.assign(sub.style, {
          fontSize: '16px',
          color: '#a1a1aa'
        });

        document.body.appendChild(pill);
        document.body.appendChild(heading);
        document.body.appendChild(sub);
      }, 250);
    }
  });
})();
