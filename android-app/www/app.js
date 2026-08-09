(function () {
  // Tab switching
  var navItems = document.querySelectorAll('.navitem');
  var views = document.querySelectorAll('[data-view]');

  function activate(targetId) {
    views.forEach(function (v) { v.classList.toggle('hidden', v.id !== targetId); });
    navItems.forEach(function (n) { n.classList.toggle('active', n.dataset.target === targetId); });

    // lazy-load the iframe for this tab only once, the first time it's opened
    var view = document.getElementById(targetId);
    var frame = view && view.querySelector('iframe.frame');
    var loadingEl = view && view.querySelector('.frame-loading');
    if (frame && frame.dataset.src && frame.src === 'about:blank') {
      var timeoutId = setTimeout(function () {
        if (loadingEl) {
          loadingEl.innerHTML = '<span class="err">Taking longer than expected to reach askshree.com.<br>Check your connection and reopen this tab.</span>';
        }
      }, 12000);

      frame.addEventListener('load', function onLoad() {
        clearTimeout(timeoutId);
        if (loadingEl) loadingEl.classList.add('hide');
        frame.removeEventListener('load', onLoad);
      });
      frame.addEventListener('error', function onErr() {
        clearTimeout(timeoutId);
        if (loadingEl) {
          loadingEl.innerHTML = '<span class="err">Could not load askshree.com.<br>Check your internet connection.</span>';
        }
        frame.removeEventListener('error', onErr);
      });

      frame.src = frame.dataset.src;
    }
  }

  navItems.forEach(function (item) {
    item.addEventListener('click', function () { activate(item.dataset.target); });
  });

  // Greeting — time of day + device name if available later via a real login
  var greet = document.getElementById('greetLine');
  var hour = new Date().getHours();
  var word = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  if (greet) greet.textContent = word;

  // Riddle reveal
  var revealBtn = document.getElementById('revealBtn');
  var clue = document.getElementById('riddleClue');
  var revealed = false;
  if (revealBtn && clue) {
    revealBtn.addEventListener('click', function () {
      revealed = !revealed;
      if (revealed) {
        clue.textContent = 'B) Recruit.ai — Job posting.ai';
        revealBtn.textContent = 'back to clue';
      } else {
        clue.textContent = '"I post your job myself and get you a shortlist — you just enjoy your coffee."';
        revealBtn.textContent = 'tap to reveal';
      }
    });
  }

  // Command bar + mic — placeholders until the voice module & search are wired to a backend
  var cmdBar = document.getElementById('cmdBar');
  var micBtn = document.getElementById('micBtn');
  [cmdBar, micBtn].forEach(function (el) {
    if (el) el.addEventListener('click', function () {
      activate('view-chat');
    });
  });

  // Hide the JS splash fallback once the app has painted (native SplashScreen plugin
  // handles the real cold-start splash; this is just a safety net for slow first paints)
  window.addEventListener('load', function () {
    setTimeout(function () {
      var s = document.getElementById('splash-fallback');
      if (s) s.classList.add('hide');
    }, 400);
  });
})();
