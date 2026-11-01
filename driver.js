(() => {
  'use strict';
  const SUPABASE_URL = 'https://kzbzbkxeuaxyjmenbgaf.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fWRUB8_rz2yZaP417fVWGw_eJHbTQR2';
  const $ = (id) => document.getElementById(id);
  const authPanel = $('authPanel');
  const consolePanel = $('consolePanel');
  const authForm = $('driverAuthForm');
  const statusBox = $('driverStatus');
  let client = null;
  let session = null;
  let driverApproved = false;
  let isOnline = false;
  let refreshTimer = null;

  function status(message, type = '') {
    statusBox.textContent = message;
    statusBox.className = 'driver-status' + (type ? ' ' + type : '');
  }
  function money(kobo) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(kobo) / 100);
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Location services are not available in this browser.'));
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => reject(new Error('Allow location access to update driver availability.')),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );
    });
  }
  async function checkDriver() {
    const uid = session.user.id;
    const [{ data: profile, error: profileError }, { data: driver, error: driverError }, { data: vehicles, error: vehicleError }] = await Promise.all([
      client.from('profiles').select('role,display_name').eq('id', uid).maybeSingle(),
      client.from('driver_profiles').select('review_status,is_online,location_updated_at').eq('user_id', uid).maybeSingle(),
      client.from('vehicles').select('make,model,registration_number,review_status').eq('driver_user_id', uid)
    ]);
    if (profileError || driverError || vehicleError) throw new Error('Could not verify your LagosGo driver account. Please contact pilot support.');
    if (!profile || profile.role !== 'driver' || !driver) throw new Error('This login is not registered as a LagosGo driver account.');
    if (driver.review_status !== 'approved') throw new Error('Your driver application is not approved yet.');
    const approvedVehicle = (vehicles || []).find(vehicle => vehicle.review_status === 'approved');
    if (!approvedVehicle) throw new Error('You need at least one approved vehicle before going online.');
    driverApproved = true;
    isOnline = Boolean(driver.is_online);
    $('driverName').textContent = profile.display_name || session.user.email || 'Driver';
    $('driverVehicle').textContent = [approvedVehicle.make, approvedVehicle.model, approvedVehicle.registration_number].filter(Boolean).join(' · ');
    $('availabilityLabel').textContent = isOnline ? 'Online' : 'Offline';
    $('availabilityButton').textContent = isOnline ? 'Go offline' : 'Go online';
    $('availabilityButton').disabled = false;
    $('refreshOffers').disabled = !isOnline;
    status('Your driver and vehicle approvals are confirmed.', 'success');
    if (isOnline) await loadOffers();
  }
  async function updatePresence(nextOnline) {
    if (!driverApproved) throw new Error('Only approved drivers can change availability.');
    const position = await getPosition();
    const { data, error } = await client.rpc('lagosgo_set_driver_presence', {
      p_is_online: nextOnline,
      p_latitude: position.latitude,
      p_longitude: position.longitude
    });
    if (error) throw new Error(error.message.includes('driver_or_vehicle_not_approved') ? 'Driver or vehicle approval is required.' : 'Could not update availability. Please retry.');
    isOnline = Boolean(data && data.is_online);
    $('availabilityLabel').textContent = isOnline ? 'Online' : 'Offline';
    $('availabilityButton').textContent = isOnline ? 'Go offline' : 'Go online';
    $('refreshOffers').disabled = !isOnline;
    status(isOnline ? 'You are online and eligible to receive nearby ride requests.' : 'You are offline and will not receive ride requests.', 'success');
    if (isOnline) await loadOffers();
    else {
      $('offersList').replaceChildren(element('p', 'muted', 'Go online to check for nearby requests.'));
      $('offerCount').textContent = '0 requests';
    }
  }
  async function respond(offerId, action, counterAmount) {
    const args = { p_offer_id: offerId, p_action: action };
    if (action === 'counter') args.p_counter_amount_kobo = Math.round(Number(counterAmount) * 100);
    const { error } = await client.rpc('lagosgo_respond_to_fare_offer', args);
    if (error) {
      const message = error.message || '';
      throw new Error(message.includes('driver_already_assigned') ? 'You already have an active trip.' :
        message.includes('offer_expired_or_closed') ? 'This request has expired or was accepted by another driver.' :
        'LagosGo could not process that response. Refresh the requests and try again.');
    }
    status(action === 'accept' ? 'Fare accepted. The passenger has been notified through the ride record.' :
      action === 'counter' ? 'Your counter-offer has been submitted.' : 'Request declined.', 'success');
    await loadOffers();
  }
  function offerCard(offer) {
    const card = element('article', 'offer-card');
    card.append(element('h3', '', 'Ride request · ' + money(offer.amount_kobo)));
    const meta = element('div', 'offer-meta');
    const pickup = element('div'); pickup.append(element('small', '', 'PICKUP'), element('strong', '', offer.pickup_label || 'Pickup location'));
    const destination = element('div'); destination.append(element('small', '', 'DESTINATION'), element('strong', '', offer.destination_label || 'Destination'));
    const distance = element('div'); distance.append(element('small', '', 'STRAIGHT-LINE DISTANCE'), element('strong', '', Number(offer.distance_km || 0).toFixed(1) + ' km'));
    const expires = element('div'); expires.append(element('small', '', 'OFFER'), element('strong', '', 'Time-limited · confirm availability'));
    meta.append(pickup, destination, distance, expires); card.append(meta);
    const actions = element('div', 'driver-actions');
    const accept = element('button', 'driver-button primary', 'Accept fare'); accept.type = 'button';
    accept.addEventListener('click', async () => { accept.disabled = true; try { await respond(offer.offer_id, 'accept'); } catch (e) { status(e.message, 'error'); accept.disabled = false; } });
    const decline = element('button', 'driver-button', 'Decline'); decline.type = 'button';
    decline.addEventListener('click', async () => { decline.disabled = true; try { await respond(offer.offer_id, 'decline'); } catch (e) { status(e.message, 'error'); decline.disabled = false; } });
    actions.append(accept, decline); card.append(actions);
    const counter = element('form', 'offer-counter');
    const amount = document.createElement('input'); amount.type = 'number'; amount.min = '1000'; amount.max = '100000'; amount.step = '100'; amount.required = true; amount.placeholder = 'Counter fare (₦)';
    amount.setAttribute('aria-label', 'Counter fare in naira');
    const submit = element('button', 'driver-button', 'Counter'); submit.type = 'submit';
    counter.append(amount, submit);
    counter.addEventListener('submit', async event => {
      event.preventDefault();
      const value = Number(amount.value);
      if (!Number.isFinite(value) || value < 1000 || value > 100000) return status('Enter a counter-offer between ₦1,000 and ₦100,000.', 'error');
      submit.disabled = true;
      try { await respond(offer.offer_id, 'counter', value); } catch (e) { status(e.message, 'error'); submit.disabled = false; }
    });
    card.append(counter);
    return card;
  }
  async function loadOffers() {
    if (!isOnline) return;
    $('refreshOffers').disabled = true;
    try {
      const { data, error } = await client.rpc('lagosgo_list_driver_offers', { p_radius_km: 5 });
      if (error) throw new Error(error.message.includes('driver_location_stale_or_offline') ? 'Your location is stale. Toggle availability to refresh your location.' : 'Could not load nearby requests.');
      const offers = data && Array.isArray(data.offers) ? data.offers : [];
      $('offersList').replaceChildren();
      $('offerCount').textContent = offers.length + (offers.length === 1 ? ' request' : ' requests');
      if (!offers.length) $('offersList').append(element('p', 'muted', 'No nearby requests at the moment. Keep availability on and check again shortly.'));
      else offers.forEach(offer => $('offersList').append(offerCard(offer)));
    } catch (error) {
      status(error.message, 'error');
    } finally {
      $('refreshOffers').disabled = !isOnline;
    }
  }
  async function showConsole(nextSession) {
    session = nextSession;
    authPanel.classList.add('hidden');
    consolePanel.classList.remove('hidden');
    try {
      await checkDriver();
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = setInterval(() => { if (isOnline) loadOffers(); }, 20000);
    } catch (error) {
      status(error.message, 'error');
      $('availabilityButton').disabled = true;
      $('refreshOffers').disabled = true;
    }
  }
  async function signOut() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
    await client.auth.signOut();
    session = null; driverApproved = false; isOnline = false;
    consolePanel.classList.add('hidden'); authPanel.classList.remove('hidden');
  }
  async function init() {
    if (!window.supabase || !window.supabase.createClient) {
      $('driverSignIn').disabled = true;
      return;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    authForm.addEventListener('submit', async event => {
      event.preventDefault();
      const button = $('driverSignIn'); button.disabled = true; button.textContent = 'Signing in…';
      try {
        const { data, error } = await client.auth.signInWithPassword({ email: $('driverEmail').value.trim(), password: $('driverPassword').value });
        if (error) throw error;
        await showConsole(data.session);
      } catch (error) {
        window.alert(error.message.includes('Invalid login credentials') ? 'Email or password is incorrect.' : error.message);
      } finally { button.disabled = false; button.textContent = 'Sign in'; }
    });
    $('availabilityButton').addEventListener('click', async () => {
      const button = $('availabilityButton'); button.disabled = true;
      try { await updatePresence(!isOnline); } catch (error) { status(error.message, 'error'); }
      finally { button.disabled = false; }
    });
    $('refreshOffers').addEventListener('click', loadOffers);
    $('driverSignOut').addEventListener('click', signOut);
    const { data } = await client.auth.getSession();
    if (data.session) await showConsole(data.session);
  }
  init();
})();
