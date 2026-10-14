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
  let destinationCoordinates = null;
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
  document.getElementById('destination').addEventListener('input', () => { destinationCoordinates = null; });
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



  // Route preview: road ETA and route steps come from the configured Google Maps backend.
  let googleMap = null;
  let activeRouteLine = null;
  let routeOriginMarker = null;
  let routeDestinationMarker = null;
  let googleMapsReady = false;
  const routeButton = document.getElementById('routePreviewBtn');
  const routeStatus = document.getElementById('routeStatus');
  const mapCanvas = document.getElementById('mapCanvas');
  const mapIllustration = document.querySelector('.map-art');
  const routeSummary = document.getElementById('routeSummary');
  const landmarkPanel = document.getElementById('landmarkPanel');
  const directionsPanel = document.getElementById('directionsPanel');
  const mapAttribution = document.getElementById('mapAttribution');

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '—';
    const mins = Math.max(1, Math.round(seconds / 60));
    if (mins < 60) return mins + ' min';
    const hours = Math.floor(mins / 60);
    const rest = mins % 60;
    return hours + ' hr' + (rest ? ' ' + rest + ' min' : '');
  }
  function formatDistance(meters) {
    if (!Number.isFinite(meters)) return '—';
    return meters >= 1000 ? (meters / 1000).toFixed(1) + ' km' : Math.round(meters) + ' m';
  }
  function showRouteStats(route) {
    routeSummary.replaceChildren();
    [
      ['Trip estimate', formatDuration(route.durationSeconds), 'Road ETA; traffic-aware when available'],
      ['Road distance', formatDistance(route.distanceMeters), 'Calculated route distance'],
      ['Pickup ETA', 'After driver match', 'Requires a real available driver']
    ].forEach(([label, value, detail]) => {
      const card = document.createElement('div');
      card.className = 'route-stat';
      const strong = document.createElement('strong'); strong.textContent = value;
      const small = document.createElement('small'); small.textContent = label + ' · ' + detail;
      card.append(strong, small); routeSummary.append(card);
    });
    routeSummary.hidden = false;
  }
  function renderDirections(steps) {
    const list = document.getElementById('directionsList');
    list.replaceChildren();
    (steps || []).slice(0, 12).forEach(step => {
      const li = document.createElement('li');
      li.append(document.createTextNode(step.instruction || 'Continue on the route'));
      const small = document.createElement('span');
      small.textContent = formatDistance(step.distanceMeters || 0);
      li.append(small); list.append(li);
    });
    directionsPanel.hidden = list.children.length === 0;
  }
  async function loadNearbyLandmarks(location) {
    landmarkPanel.hidden = false;
    const list = document.getElementById('landmarkList');
    list.replaceChildren();
    const loading = document.createElement('p');
    loading.className = 'route-status'; loading.textContent = 'Finding nearby places…'; list.append(loading);
    try {
      const response = await fetch('/api/maps/landmarks', {
        method: 'POST', headers: {'Content-Type':'application/json','Accept':'application/json'},
        body: JSON.stringify({latitude: location.latitude, longitude: location.longitude})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Landmark service unavailable');
      list.replaceChildren();
      if (!data.places || !data.places.length) {
        list.textContent = 'No mapped landmarks were found near this destination.';
        return;
      }
      data.places.forEach(place => {
        const item = place.url ? document.createElement('a') : document.createElement('div');
        item.className = 'landmark-item';
        if (place.url) { item.href = place.url; item.target = '_blank'; item.rel = 'noopener noreferrer'; }
        const pin = document.createElement('span'); pin.className = 'landmark-pin'; pin.textContent = '⌖';
        const copy = document.createElement('span');
        const name = document.createElement('strong'); name.textContent = place.name;
        const meta = document.createElement('small'); meta.textContent = [place.type, place.address].filter(Boolean).join(' · ');
        copy.append(name, meta); item.append(pin, copy); list.append(item);
      });
    } catch (_error) {
      list.replaceChildren();
      const note = document.createElement('p'); note.className = 'route-status';
      note.textContent = 'Nearby landmarks will appear when the Places service is configured.';
      list.append(note);
    }
  }
  async function setupRouteMap() {
    try {
      const response = await fetch('/api/maps/config', {cache:'no-store'});
      const config = await response.json();
      if (!config.browserKey) {
        mapAttribution.textContent = 'Interactive map needs GOOGLE_MAPS_BROWSER_KEY in Vercel. Route calculations also need GOOGLE_MAPS_SERVER_KEY. The sample map is illustrative.';
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(config.browserKey) + '&libraries=geometry,places&v=weekly';
      script.async = true;
      script.onload = () => {
        try {
          googleMap = new google.maps.Map(mapCanvas, {
            center: {lat:6.5244,lng:3.3792}, zoom:11, mapTypeControl:false,
            streetViewControl:false, fullscreenControl:false, clickableIcons:true,
            gestureHandling:'cooperative'
          });
          googleMapsReady = true;
          const lagosBounds = new google.maps.LatLngBounds(
            {lat:6.25,lng:2.65},
            {lat:6.95,lng:4.05}
          );
          const autocompleteOptions = {
            fields:['formatted_address','geometry','name'],
            componentRestrictions:{country:'ng'},
            bounds:lagosBounds,
            strictBounds:false
          };
          const pickupAutocomplete = new google.maps.places.Autocomplete(document.getElementById('pickup'), autocompleteOptions);
          const destinationAutocomplete = new google.maps.places.Autocomplete(document.getElementById('destination'), autocompleteOptions);
          pickupAutocomplete.addListener('place_changed', () => {
            const place = pickupAutocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) {
              pickupCoordinates = null;
              return;
            }
            pickupCoordinates = {latitude:place.geometry.location.lat(),longitude:place.geometry.location.lng()};
            document.getElementById('pickup').value = place.formatted_address || place.name || document.getElementById('pickup').value;
            delete document.getElementById('pickup').dataset.usesCurrentLocation;
          });
          destinationAutocomplete.addListener('place_changed', () => {
            const place = destinationAutocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) {
              destinationCoordinates = null;
              return;
            }
            destinationCoordinates = {latitude:place.geometry.location.lat(),longitude:place.geometry.location.lng()};
            document.getElementById('destination').value = place.formatted_address || place.name || document.getElementById('destination').value;
          });
          mapCanvas.hidden = false;
          mapIllustration.hidden = true;
          document.getElementById('routeMapLabel').lastChild.textContent = ' LAGOS · INTERACTIVE MAP';
          mapAttribution.textContent = 'Map data © Google. Route time is an estimate and may change with traffic.';
        } catch (_error) {
          mapAttribution.textContent = 'The map could not initialise. Check the browser API key and its website restrictions.';
        }
      };
      script.onerror = () => {
        mapAttribution.textContent = 'The map could not load. Check that Maps JavaScript API is enabled and the browser key is correctly restricted.';
      };
      document.head.append(script);
    } catch (_error) {
      mapAttribution.textContent = 'Map services are not configured yet. The sample map is illustrative.';
    }
  }
  setupRouteMap();

  routeButton.addEventListener('click', async () => {
    const pickup = document.getElementById('pickup').value.trim();
    const destination = document.getElementById('destination').value.trim();
    if ((!pickup && !pickupCoordinates) || !destination) {
      const missing = !destination ? document.getElementById('destination') : document.getElementById('pickup');
      missing.focus();
      routeStatus.textContent = 'Enter both pickup and destination before calculating the route.';
      return;
    }
    routeButton.disabled = true;
    routeButton.querySelector('.route-button-arrow').textContent = '…';
    routeStatus.textContent = 'Calculating a road route. This can take a few seconds…';
    try {
      const response = await fetch('/api/maps/route', {
        method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({pickup, destination, pickupCoordinates, destinationCoordinates})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Route service unavailable');
      showRouteStats(data);
      renderDirections(data.steps || []);
      document.getElementById('mapCaptionText').textContent = 'Calculated road route · ' + formatDistance(data.distanceMeters);
      routeStatus.textContent = 'Route calculated. This is the trip estimate between pickup and destination—not the driver’s arrival time.';
      if (googleMapsReady && data.polyline) {
        const path = google.maps.geometry.encoding.decodePath(data.polyline);
        if (activeRouteLine) activeRouteLine.setMap(null);
        if (routeOriginMarker) routeOriginMarker.setMap(null);
        if (routeDestinationMarker) routeDestinationMarker.setMap(null);
        activeRouteLine = new google.maps.Polyline({path, geodesic:true, strokeColor:'#171717', strokeOpacity:0.9, strokeWeight:6, map:googleMap});
        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        googleMap.fitBounds(bounds, 36);
        routeOriginMarker = new google.maps.Marker({position:path[0], map:googleMap, title:'Pickup', label:{text:'P',color:'#171717',fontWeight:'bold'}});
        routeDestinationMarker = new google.maps.Marker({position:path[path.length-1], map:googleMap, title:'Destination', label:{text:'D',color:'#171717',fontWeight:'bold'}});
      }
      if (data.destinationLocation) await loadNearbyLandmarks(data.destinationLocation);
      else {
        landmarkPanel.hidden = false;
        document.getElementById('landmarkList').textContent = 'Nearby landmarks are not available for this route.';
      }
    } catch (error) {
      routeStatus.textContent = error.message || 'Could not calculate this route. Try again or use a nearby landmark.';
    } finally {
      routeButton.disabled = false;
      routeButton.querySelector('.route-button-arrow').textContent = '→';
    }
  });
  document.getElementById('destination').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); routeButton.click(); }
  });
  document.getElementById('pickup').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); routeButton.click(); }
  });

  document.querySelectorAll('[data-scroll-form]').forEach(button => {
    button.addEventListener('click', () => {
      const form = document.getElementById(button.dataset.scrollForm);
      form.scrollIntoView({behavior:'smooth', block:'start'});
      const first = form.querySelector('input:not([type=checkbox])');
      if (first) first.focus({preventScroll:true});
    });
  });
  document.querySelectorAll('.lead-form').forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const status = form.querySelector('.lead-status');
      const submit = form.querySelector('.lead-submit');
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      values.type = form.dataset.leadType;
      values.consent = form.querySelector('[name="consent"]').checked;
      values.vehicleStandards = form.querySelector('[name="vehicleStandards"]')?.checked === true;
      status.textContent = 'Sending securely…';
      submit.disabled = true;
      try {
        const response = await fetch('/api/leads', {
          method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
          body:JSON.stringify(values)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'This form is not available yet.');
        status.textContent = data.message || 'Thank you. Your interest has been sent.';
        form.reset();
      } catch (error) {
        status.textContent = error.message || 'We could not submit this form. Please try again later.';
      } finally {
        submit.disabled = false;
      }
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
