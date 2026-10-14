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


  document.querySelectorAll('.service-tile').forEach(button => {
    button.addEventListener('click', () => {
      const service = button.dataset.service;
      if (service === 'Ride') {
        document.querySelector('.booking-panel').scrollIntoView({behavior:'smooth', block:'start'});
        return;
      }
      const states = {
        'Go Food': 'Go Food is a planned local food-delivery service, not available for orders yet.',
        'Go Send': 'Go Send is planned for parcels and errands. Dispatch and tracking are not connected yet.',
        'GoShare': 'GoShare is on the future roadmap and will follow reliable solo-ride dispatch.'
      };
      notify(states[service] || (service + ' is planned for a future LagosGo release.'));
    });
  });

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

  // Push notifications are enabled only when the backend endpoints are configured.
  const alertsButton = document.getElementById('enableRideAlerts');
  const alertsStatus = document.getElementById('alertsStatus');
  const alertsDescription = document.getElementById('alertsDescription');
  function setAlertStatus(message) {
    alertsStatus.textContent = message;
  }
  function decodeVapidKey(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }
  function isIOSDevice() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function iosVersionSupportsWebPush() {
    const match = navigator.userAgent.match(/OS (\d+)[._](\d+)/);
    return !match || Number(match[1]) > 16 || (Number(match[1]) === 16 && Number(match[2]) >= 4);
  }
  alertsButton.addEventListener('click', async () => {
    alertsButton.disabled = true;
    setAlertStatus('Checking device support and LagosGo notification service…');
    try {
      if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setAlertStatus('This browser does not support web push notifications. Update your browser or use a supported device.');
        return;
      }
      if (isIOSDevice() && !iosVersionSupportsWebPush()) {
        setAlertStatus('On iPhone or iPad, web push requires iOS/iPadOS 16.4 or later.');
        return;
      }
      const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
      if (isIOSDevice() && !standalone) {
        setAlertStatus('On iPhone or iPad, first add LagosGo to your Home Screen from Safari, then open the installed app and try again.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      if (!registration.pushManager) {
        setAlertStatus('Push messaging is unavailable in this browser.');
        return;
      }

      // Check service configuration before prompting for permission.
      const keyResponse = await fetch('/api/push/public-key', { headers: { 'Accept': 'application/json' } });
      if (!keyResponse.ok) {
        setAlertStatus('Ride alerts are not connected to the LagosGo backend yet. No notification permission was requested.');
        return;
      }
      const keyPayload = await keyResponse.json();
      if (!keyPayload.publicKey) {
        setAlertStatus('The notification service has not supplied a VAPID public key yet.');
        return;
      }
      if (Notification.permission === 'denied') {
        setAlertStatus('Notifications are blocked for LagosGo in your device settings. Enable them there, then try again.');
        return;
      }
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (permission !== 'granted') {
        setAlertStatus('Notifications were not enabled. You can enable them later in your browser or device settings.');
        return;
      }
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(keyPayload.publicKey)
        });
      }
      const saveResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });
      if (saveResponse.status === 401 || saveResponse.status === 403) {
        setAlertStatus('Sign-in is required to link ride alerts to your LagosGo account. Account sign-in is not available in this prototype yet.');
        return;
      }
      if (!saveResponse.ok) {
        setAlertStatus('The subscription was created on this device, but LagosGo could not save it. Please try again later.');
        return;
      }
      setAlertStatus('Ride alerts are enabled for this device.');
      alertsButton.textContent = 'Alerts enabled';
      alertsDescription.textContent = 'You can manage notification permission in your device settings.';
    } catch (error) {
      setAlertStatus('Could not enable ride alerts. Check your connection and try again.');
    } finally {
      alertsButton.disabled = false;
    }
  });
})();
