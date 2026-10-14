(() => {
  const toast = document.getElementById('toast');
  let toastTimer;
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  let selectedRide = {name:'Go Lite', price:3200};
  document.querySelectorAll('.ride-option').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.ride-option').forEach(item => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      selectedRide = {name:button.dataset.ride, price:Number(button.dataset.price)};
      document.querySelector('.book-button > span:first-child').textContent = 'Confirm ' + selectedRide.name;
    });
  });
  document.getElementById('bookBtn').addEventListener('click', () => {
    const destination = document.getElementById('destination').value.trim();
    if (!destination) {
      document.getElementById('destination').focus();
      notify('Add your destination to preview this booking. No ride will be dispatched in demo mode.');
      return;
    }
    notify('Demo only: ' + selectedRide.name + ' to ' + destination + ' · illustrative fare ₦' + selectedRide.price.toLocaleString('en-NG') + '. Live booking is not connected yet.');
  });
  document.getElementById('compareBtn').addEventListener('click', () => notify('Choose a ride card to compare illustrative fares and pickup estimates.'));
  document.getElementById('fareInfo').addEventListener('click', () => notify('LagosGo is designed for upfront fare estimates and transparent platform fees. These sample prices are not live quotes.'));
  document.getElementById('locateBtn').addEventListener('click', () => notify('Location access is not connected in this prototype. Enter your pickup manually.'));
  document.getElementById('profileBtn').addEventListener('click', () => notify('Passenger profile and sign-in are planned; accounts are not connected yet.'));
  document.getElementById('driverBtn').addEventListener('click', () => notify('Driver onboarding is on the roadmap, with transparent earnings and verified documents as core requirements.'));
  document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    if (button.dataset.tab !== 'Ride') notify(button.dataset.tab + ' is part of the planned LagosGo experience and is not connected yet.');
  }));

  // PWA installation: native prompt on supported Chromium browsers, guidance for iOS Safari.
  const installCard = document.getElementById('installCard');
  const installBtn = document.getElementById('installBtn');
  const installMessage = document.getElementById('installMessage');
  const iosHelp = document.getElementById('iosHelp');
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let deferredInstallPrompt = null;

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        notify('LagosGo is available in your browser. Offline shell setup could not be completed on this visit.');
      });
    });
  }

  if (!isStandalone && isIOS) {
    installCard.hidden = false;
    installBtn.textContent = 'How to install';
    installMessage.textContent = 'Add LagosGo to your iPhone Home Screen from Safari.';
    installBtn.addEventListener('click', () => { iosHelp.hidden = !iosHelp.hidden; });
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (!isStandalone) {
      installCard.hidden = false;
      installBtn.textContent = 'Install app';
      installMessage.textContent = 'Add LagosGo to your home screen for faster access.';
    }
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      if (isIOS) iosHelp.hidden = false;
      else notify('If installation is not offered, open your browser menu and choose Install app or Add to Home screen.');
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installCard.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    installCard.hidden = true;
    notify('LagosGo has been added to your device.');
  });
  document.getElementById('dismissIosHelp').addEventListener('click', () => { iosHelp.hidden = true; });
})();
