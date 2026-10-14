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
  let pickupCoordinates = null;
  document.getElementById('locateBtn').addEventListener('click', () => {
    const input = document.getElementById('pickup');
    if (!('geolocation' in navigator)) {
      notify('This browser cannot provide your location. Enter your pickup manually.');
      return;
    }
    input.value = 'Finding your location…';
    navigator.geolocation.getCurrentPosition(position => {
      pickupCoordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      input.value = 'Current location';
      input.dataset.usesCurrentLocation = 'true';
      notify('Pickup location found. Calculate your route to see the road estimate.');
    }, () => {
      pickupCoordinates = null;
      input.value = '';
      input.placeholder = 'Enter pickup location';
      notify('Location access was unavailable. Enter your pickup manually.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  });
  document.getElementById('pickup').addEventListener('input', event => {
    pickupCoordinates = null;
    delete event.currentTarget.dataset.usesCurrentLocation;
  });
  document.getElementById('profileBtn').addEventListener('click', () => notify('Passenger profile and sign-in are planned; accounts are not connected yet.'));

  // Adapted fare-choice concept: all offers remain illustrative until dispatch is connected.
  document.querySelectorAll('.price-mode-btn').forEach(button => {
    button.addEventListener('click', () => {
      const offerMode = button.dataset.priceMode === 'offer';
      document.querySelectorAll('.price-mode-btn').forEach(item => {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
      document.getElementById('offerPanel').hidden = !offerMode;
      if (offerMode) document.getElementById('offerFare').focus();
    });
  });
  document.getElementById('previewOffer').addEventListener('click', () => {
    const amount = Number(document.getElementById('offerFare').value);
    const destination = document.getElementById('destination').value.trim();
    if (!destination) {
      document.getElementById('destination').focus();
      notify('Enter your destination first. No driver will receive this offer in preview mode.');
      return;
    }
    if (!Number.isFinite(amount) || amount < 1000 || amount > 100000) {
      notify('Enter a suggested fare between ₦1,000 and ₦100,000 for this demo.');
      return;
    }
    notify('Offer preview: ₦' + amount.toLocaleString('en-NG') + ' to ' + destination + '. No driver has received or accepted this offer.');
  });

  // Safety controls explain intended behaviour but do not imply emergency services are connected.
  document.querySelectorAll('.safety-action').forEach(button => {
    button.addEventListener('click', () => {
      const messages = {
        share: 'Trip sharing is planned. Live location links and trusted-contact permissions are not connected yet.',
        checkin: 'Arrival check-in preview only. LagosGo cannot yet verify your arrival or notify a trusted contact.',
        help: 'Safety support is not connected yet. If you are in immediate danger, contact local emergency services.'
      };
      notify(messages[button.dataset.safety] || 'This safety feature is planned.');
    });
  });
  document.getElementById('driverBtn').addEventListener('click', () => {
    document.getElementById('driverLeadForm').scrollIntoView({behavior:'smooth', block:'start'});
    document.querySelector('#driverLeadForm input[name="name"]').focus({preventScroll:true});
  });
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
      } else if (service === 'Go Food') {
        document.getElementById('goFood').scrollIntoView({behavior:'smooth', block:'start'});
        document.getElementById('foodSearch').focus({preventScroll:true});
      } else {
        const states = {
          'Go Send': 'Go Send is planned for parcels and errands. Dispatch and tracking are not connected yet.',
          'GoShare': 'GoShare is on the future roadmap and will follow reliable solo-ride dispatch.'
        };
        notify(states[service] || (service + ' is planned for a future LagosGo release.'));
      }
    });
  });

  // Go Food marketplace preview: search and category filters operate on sample listings only.
  let selectedFoodCategory = 'All';
  const foodSearch = document.getElementById('foodSearch');
  const restaurantCards = [...document.querySelectorAll('.restaurant-card')];
  function filterFoodListings() {
    const term = foodSearch.value.trim().toLowerCase();
    restaurantCards.forEach(card => {
      const categoryMatches = selectedFoodCategory === 'All' ||
        card.dataset.foodCategory === selectedFoodCategory ||
        (selectedFoodCategory === 'Drinks' && /drink|juice|smoothie/i.test(card.dataset.foodName));
      const termMatches = !term || (card.dataset.foodName + ' ' + card.textContent).toLowerCase().includes(term);
      card.hidden = !(categoryMatches && termMatches);
    });
  }
  document.querySelectorAll('.food-category').forEach(button => {
    button.addEventListener('click', () => {
      selectedFoodCategory = button.dataset.foodCategory;
      document.querySelectorAll('.food-category').forEach(item => {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
      filterFoodListings();
    });
  });
  foodSearch.addEventListener('input', filterFoodListings);
  document.querySelectorAll('.restaurant-action').forEach(button => {
    button.addEventListener('click', () => notify(button.dataset.restaurant + ' menu is a design preview. Merchant menus and ordering are not connected yet.'));
  });

  document.querySelectorAll('.partner-action').forEach(button => {
    button.addEventListener('click', () => {
      const message = button.dataset.partner === 'courier'
        ? 'LagosGo courier onboarding is planned. Driver identity checks, delivery zones, earnings and payout operations are not connected yet.'
        : 'LagosGo food-partner registration is planned. Merchant verification, menus, order management and settlements are not connected yet.';
      notify(message);
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

      // Fail closed before asking for permission: verify the full backend is enabled first.
      const statusResponse = await fetch('/api/push/status', { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
      if (!statusResponse.ok) {
        setAlertStatus('Ride alerts are not connected to an authenticated LagosGo account and delivery service yet. No notification permission was requested.');
        return;
      }
      const serviceStatus = await statusResponse.json();
      if (serviceStatus.enabled !== true) {
        setAlertStatus('Ride alerts are not ready yet. No notification permission was requested.');
        return;
      }
      const keyResponse = await fetch('/api/push/public-key', { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
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
