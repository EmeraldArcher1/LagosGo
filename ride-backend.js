(() => {
  const dialog = document.getElementById('authDialog');
  const form = document.getElementById('authForm');
  if (!dialog || !form) return;

  // Supabase publishable keys are intended for browser use; authorization remains enforced by RLS/RPCs.
  const SUPABASE_URL = 'https://kzbzbkxeuaxyjmenbgaf.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fWRUB8_rz2yZaP417fVWGw_eJHbTQR2';
  const status = document.getElementById('authStatus');
  const title = document.getElementById('authTitle');
  const intro = document.getElementById('authIntro');
  const nameWrap = document.getElementById('authNameWrap');
  const nameInput = document.getElementById('authDisplayName');
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const submit = document.getElementById('authSubmit');
  const modeToggle = document.getElementById('authModeToggle');
  const signOut = document.getElementById('authSignOut');
  const profileButton = document.getElementById('profileBtn');
  const driverInboxToggle = document.getElementById('driverInboxToggle');
  const driverInbox = document.getElementById('driverInbox');
  const driverInboxStatus = document.getElementById('driverInboxStatus');
  const driverInboxRefresh = document.getElementById('driverInboxRefresh');
  const driverOfferList = document.getElementById('driverOfferList');
  const activeRideToggle = document.getElementById('activeRideToggle');
  const activeRidePanel = document.getElementById('activeRidePanel');
  const activeRideStatus = document.getElementById('activeRideStatus');
  const activeRideRefresh = document.getElementById('activeRideRefresh');
  const passengerActiveRideList = document.getElementById('passengerActiveRideList');
  const driverActiveRideList = document.getElementById('driverActiveRideList');
  let driverOfferPoll = null;
  let isSignUp = false;
  let client = null;
  let currentSession = null;

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.style.color = isError ? '#a12525' : '#38613d';
  }
  function setMode(signUp) {
    isSignUp = signUp;
    title.textContent = signUp ? 'Create your account' : 'Welcome to LagosGo';
    intro.textContent = signUp ? 'Create a passenger account to join the LagosGo pilot.' : 'Sign in to manage your LagosGo account.';
    nameWrap.hidden = !signUp;
    nameInput.required = signUp;
    passwordInput.autocomplete = signUp ? 'new-password' : 'current-password';
    submit.innerHTML = signUp ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
    modeToggle.textContent = signUp ? 'Already registered? Sign in' : 'New to LagosGo? Create an account';
    setStatus('');
  }
  function openAuth() {
    if (currentSession) {
      title.textContent = 'Your LagosGo account';
      intro.textContent = currentSession.user.email || 'Signed in';
      nameWrap.hidden = true;
      modeToggle.hidden = true;
      submit.hidden = true;
      signOut.hidden = false;
      setStatus('You are signed in.');
      if (driverInboxToggle) driverInboxToggle.hidden = false;
      if (activeRideToggle) activeRideToggle.hidden = false;
    } else {
      setMode(false);
      modeToggle.hidden = false;
      submit.hidden = false;
      signOut.hidden = true;
      if (driverInboxToggle) driverInboxToggle.hidden = true;
      if (activeRideToggle) activeRideToggle.hidden = true;
      if (activeRidePanel) activeRidePanel.hidden = true;
      if (driverInbox) driverInbox.hidden = true;
      stopDriverOfferPolling();
    }
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  window.lagosGoOpenAuth = openAuth;

  function stopDriverOfferPolling() {
    if (driverOfferPoll) clearInterval(driverOfferPoll);
    driverOfferPoll = null;
  }
  function renderDriverOffers(offers) {
    driverOfferList.replaceChildren();
    if (!offers.length) {
      driverInboxStatus.textContent = 'No active dispatch offers right now. Keep your driver availability and location up to date.';
      return;
    }
    driverInboxStatus.textContent = offers.length + ' active offer' + (offers.length === 1 ? '' : 's');
    offers.forEach(offer => {
      const card = document.createElement('article');
      card.style.cssText = 'border:1px solid #ddd;border-radius:12px;padding:12px;margin:10px 0;background:#fff;color:#171717';
      const title = document.createElement('strong');
      title.textContent = 'Pickup: ' + offer.pickup_label;
      const destination = document.createElement('p');
      destination.textContent = 'Destination: ' + offer.destination_label;
      const details = document.createElement('p');
      const fare = new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(offer.passenger_offer_kobo)/100);
      details.textContent = fare + ' · about ' + Math.max(1,Math.round(Number(offer.road_eta_seconds)/60)) + ' min to pickup · expires ' + new Date(offer.expires_at).toLocaleTimeString();
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
      const accept = document.createElement('button');
      accept.type = 'button';
      accept.textContent = 'Accept ride';
      accept.className = 'lead-submit';
      const decline = document.createElement('button');
      decline.type = 'button';
      decline.textContent = 'Decline';
      decline.className = 'auth-mode-toggle';
      accept.addEventListener('click', async () => {
        accept.disabled = decline.disabled = true;
        driverInboxStatus.textContent = 'Confirming your acceptance…';
        try {
          await window.lagosGoRespondToDispatchOffer(offer.offer_id,'accept');
          driverInboxStatus.textContent = 'Ride accepted. Open your active trip to continue.';
          await refreshDriverOffers();
        } catch (error) {
          driverInboxStatus.textContent = error.message || 'Could not accept this offer.';
          accept.disabled = decline.disabled = false;
        }
      });
      decline.addEventListener('click', async () => {
        accept.disabled = decline.disabled = true;
        try {
          await window.lagosGoRespondToDispatchOffer(offer.offer_id,'decline');
          await refreshDriverOffers();
        } catch (error) {
          driverInboxStatus.textContent = error.message || 'Could not decline this offer.';
          accept.disabled = decline.disabled = false;
        }
      });
      actions.append(accept,decline);
      card.append(title,destination,details,actions);
      driverOfferList.append(card);
    });
  }
  async function refreshDriverOffers() {
    if (!currentSession || !driverInbox || driverInbox.hidden) return;
    try {
      const offers = await window.lagosGoListDispatchOffers();
      renderDriverOffers(offers);
    } catch (_error) {
      driverInboxStatus.textContent = 'Driver offers are available only to approved LagosGo driver accounts. If your driver profile is pending, contact the pilot team.';
      driverOfferList.replaceChildren();
      stopDriverOfferPolling();
    }
  }
  function toggleDriverInbox() {
    driverInbox.hidden = !driverInbox.hidden;
    if (driverInbox.hidden) {
      stopDriverOfferPolling();
      return;
    }
    refreshDriverOffers();
    stopDriverOfferPolling();
    driverOfferPoll = setInterval(refreshDriverOffers,10000);
  }
  if (driverInboxToggle) driverInboxToggle.addEventListener('click',toggleDriverInbox);
  if (driverInboxRefresh) driverInboxRefresh.addEventListener('click',refreshDriverOffers);
  if (activeRideToggle) activeRideToggle.addEventListener('click',() => {
    activeRidePanel.hidden = !activeRidePanel.hidden;
    if (!activeRidePanel.hidden) refreshActiveRides();
  });
  if (activeRideRefresh) activeRideRefresh.addEventListener('click',refreshActiveRides);
  dialog.addEventListener('close',stopDriverOfferPolling);
  document.getElementById('authClose').addEventListener('click', () => dialog.close());
  modeToggle.addEventListener('click', () => setMode(!isSignUp));
  signOut.addEventListener('click', async () => {
    if (!client) return;
    signOut.disabled = true;
    const { error } = await client.auth.signOut();
    signOut.disabled = false;
    if (error) return setStatus('Could not sign out. Please try again.', true);
    setStatus('You have signed out.');
    if (driverInboxToggle) driverInboxToggle.hidden = true;
    if (driverInbox) driverInbox.hidden = true;
    stopDriverOfferPolling();
    dialog.close();
  });

  function updateSession(session) {
    currentSession = session;
    if (driverInboxToggle) driverInboxToggle.hidden = !session;
    if (activeRideToggle) activeRideToggle.hidden = !session;
    if (!session && driverInbox) driverInbox.hidden = true;
    if (!session && activeRidePanel) activeRidePanel.hidden = true;
    if (!session) stopDriverOfferPolling();
    if (profileButton) {
      const label = session && session.user && session.user.email ? session.user.email.trim().charAt(0).toUpperCase() : 'U';
      profileButton.textContent = label || 'U';
      profileButton.setAttribute('aria-label', session ? 'Account signed in. Open account menu' : 'Sign in or create account');
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) {
      setStatus('Account service could not load. Check your connection and reload LagosGo.', true);
      return;
    }
    if (!form.reportValidity()) return;
    submit.disabled = true;
    setStatus(isSignUp ? 'Creating your account…' : 'Signing in…');
    try {
      let result;
      if (isSignUp) {
        result = await client.auth.signUp({
          email: emailInput.value.trim(),
          password: passwordInput.value,
          options: { data: { display_name: nameInput.value.trim() } }
        });
        if (result.error) throw result.error;
        if (result.data.session) {
          updateSession(result.data.session);
          setStatus('Account created and signed in. Ride booking is not enabled yet.');
        } else {
          setStatus('Account created. Check your email to confirm your address, then sign in.');
        }
      } else {
        result = await client.auth.signInWithPassword({ email: emailInput.value.trim(), password: passwordInput.value });
        if (result.error) throw result.error;
        updateSession(result.data.session);
        setStatus('Signed in successfully. Live ride booking is not enabled yet.');
      }
      if (currentSession) {
        modeToggle.hidden = true;
        submit.hidden = true;
        signOut.hidden = false;
        nameWrap.hidden = true;
        intro.textContent = currentSession.user.email || 'Signed in';
      }
    } catch (error) {
      const message = String(error && error.message || '');
      setStatus(message.toLowerCase().includes('invalid login') ? 'Email or password is incorrect.' :
        message.toLowerCase().includes('already registered') ? 'An account with this email already exists. Sign in instead.' :
        'We could not complete account access. Check your details and try again.', true);
    } finally {
      submit.disabled = false;
    }
  });

  function initialise() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      setStatus('Account service could not load. Check your connection and reload LagosGo.', true);
      return;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    window.lagosGoSupabase = client;
    client.auth.getSession().then(({ data }) => updateSession(data.session));
    client.auth.onAuthStateChange((_event, session) => updateSession(session));
  }

  function moneyFromKobo(value) {
    return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value || 0)/100);
  }
  function statusLabel(value) {
    return ({accepted:'Driver accepted',driver_en_route:'Driver on the way',arrived:'Driver arrived',in_progress:'Trip in progress'})[value] || value;
  }
  function makeTripCard(ride, role) {
    const card = document.createElement('article');
    card.style.cssText = 'border:1px solid #ddd;border-radius:12px;padding:12px;margin:10px 0;background:#fff;color:#171717';
    const heading = document.createElement('strong');
    heading.textContent = (role === 'driver' ? 'Assigned trip · ' : 'Your booking · ') + statusLabel(ride.status);
    const route = document.createElement('p');
    route.textContent = ride.pickup_label + ' → ' + ride.destination_label;
    const fare = document.createElement('p');
    fare.textContent = 'Agreed fare: ' + moneyFromKobo(ride.confirmed_fare_kobo);
    card.append(heading,route,fare);

    if (role === 'passenger' && ['accepted','driver_en_route','arrived'].includes(ride.status)) {
      const pinStatus = document.createElement('p');
      pinStatus.className = 'pickup-pin-status';
      pinStatus.setAttribute('role','status');
      const issue = document.createElement('button');
      issue.type = 'button'; issue.className = 'auth-mode-toggle'; issue.textContent = 'Generate pickup PIN';
      issue.addEventListener('click',async () => {
        issue.disabled = true; pinStatus.textContent = 'Generating a private pickup PIN…';
        try {
          const result = await window.lagosGoIssuePickupPin(ride.id);
          pinStatus.textContent = 'Give this four-digit PIN to your assigned driver at pickup: ' + result.pickup_pin + '. It expires in 30 minutes.';
          issue.textContent = 'Generate a new PIN';
        } catch (error) { pinStatus.textContent = error.message || 'Could not generate the pickup PIN.'; }
        finally { issue.disabled = false; }
      });
      card.append(issue,pinStatus);
    }

    if (role === 'driver') {
      const actionStatus = document.createElement('p'); actionStatus.setAttribute('role','status');
      const advance = async (nextStatus,button) => {
        button.disabled = true; actionStatus.textContent = 'Updating trip…';
        try { await window.lagosGoAdvanceRide(ride.id,nextStatus); actionStatus.textContent = 'Trip updated.'; await refreshActiveRides(); }
        catch (error) { actionStatus.textContent = error.message || 'Could not update this trip.'; button.disabled = false; }
      };
      if (ride.status === 'accepted' || ride.status === 'driver_en_route') {
        const next = ride.status === 'accepted' ? 'driver_en_route' : 'arrived';
        const button = document.createElement('button'); button.type = 'button'; button.className = 'auth-mode-toggle';
        button.textContent = ride.status === 'accepted' ? 'Start driving to pickup' : 'I have arrived';
        button.addEventListener('click',() => advance(next,button)); card.append(button);
      } else if (ride.status === 'arrived') {
        const label = document.createElement('label'); label.textContent = 'Passenger pickup PIN';
        const input = document.createElement('input'); input.type = 'text'; input.inputMode = 'numeric';
        input.autocomplete = 'one-time-code'; input.pattern = '[0-9]{4}'; input.maxLength = 4; input.placeholder = '4-digit PIN';
        input.setAttribute('aria-label','Passenger four-digit pickup PIN'); label.append(input);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'auth-mode-toggle'; button.textContent = 'Verify PIN & start trip';
        button.addEventListener('click',async () => {
          if (!/^[0-9]{4}$/.test(input.value)) { actionStatus.textContent = 'Enter the passenger’s four-digit PIN.'; return; }
          button.disabled = true; actionStatus.textContent = 'Verifying passenger PIN…';
          try {
            const result = await window.lagosGoVerifyPickupPin(ride.id,input.value);
            if (!result || result.ok === false) throw new Error('Pickup PIN was not verified. The trip has not started.');
            await window.lagosGoAdvanceRide(ride.id,'in_progress');
            actionStatus.textContent = 'PIN verified. Trip started.'; await refreshActiveRides();
          } catch (error) { actionStatus.textContent = error.message || 'PIN verification failed.'; button.disabled = false; }
        });
        card.append(label,button);
      } else if (ride.status === 'in_progress') {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'auth-mode-toggle';
        button.textContent = 'Complete trip'; button.addEventListener('click',() => advance('completed',button)); card.append(button);
      }
      card.append(actionStatus);
    }
    return card;
  }

  async function refreshActiveRides() {
    if (!currentSession || !activeRidePanel || activeRidePanel.hidden || !window.lagosGoListMyActiveRides) return;
    activeRideStatus.textContent = 'Loading your active rides…';
    passengerActiveRideList.replaceChildren(); driverActiveRideList.replaceChildren();
    try {
      const rides = await window.lagosGoListMyActiveRides();
      const uid = currentSession.user.id;
      const passengerRides = rides.filter(ride => ride.passenger_user_id === uid);
      const driverRides = rides.filter(ride => ride.driver_user_id === uid);
      passengerRides.forEach(ride => passengerActiveRideList.append(makeTripCard(ride,'passenger')));
      driverRides.forEach(ride => driverActiveRideList.append(makeTripCard(ride,'driver')));
      if (!passengerRides.length && !driverRides.length) activeRideStatus.textContent = 'No active rides are linked to this account.';
      else {
        activeRideStatus.textContent = 'Your active trip details are shown below. Refresh to check the latest status.';
        if (passengerRides.length) { const h=document.createElement('h4'); h.textContent='Passenger'; passengerActiveRideList.prepend(h); }
        if (driverRides.length) { const h=document.createElement('h4'); h.textContent='Driver'; driverActiveRideList.prepend(h); }
      }
    } catch (error) { activeRideStatus.textContent = error.message || 'Could not load active rides.'; }
  }

  initialise();
})();


/* Authenticated ride-request helper. Booking remains blocked unless real coordinates and a signed-in passenger exist. */
window.lagosGoCreateRideRequest = async function ({ pickup, pickupCoordinates, destination, destinationCoordinates, amountNgn }) {
  const client = window.lagosGoSupabase;
  if (!client) throw new Error('Account service is still loading. Please retry.');
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData.session) throw new Error('Sign in to submit a ride request.');
  if (!pickupCoordinates || !destinationCoordinates) throw new Error('Choose pickup and destination from the LagosGo map suggestions so we can validate both coordinates.');
  const amount = Number(amountNgn);
  if (!Number.isFinite(amount) || amount < 1000 || amount > 100000) throw new Error('Enter a proposed fare between ₦1,000 and ₦100,000.');
  const idempotencyKey = (window.crypto && typeof window.crypto.randomUUID === 'function')
    ? window.crypto.randomUUID()
    : 'lg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 18);
  const { data, error } = await client.rpc('lagosgo_request_ride', {
    p_pickup_label: pickup,
    p_pickup_latitude: pickupCoordinates.latitude,
    p_pickup_longitude: pickupCoordinates.longitude,
    p_destination_label: destination,
    p_destination_latitude: destinationCoordinates.latitude,
    p_destination_longitude: destinationCoordinates.longitude,
    p_initial_offer_kobo: Math.round(amount * 100),
    p_idempotency_key: idempotencyKey
  });
  if (error) {
    const message = String(error.message || '');
    if (message.includes('passenger_account_required')) throw new Error('This account is not enabled as a passenger. Please contact LagosGo pilot support.');
    if (message.includes('offer_outside_guardrails')) throw new Error('The proposed fare is outside the permitted range.');
    throw new Error('LagosGo could not submit this ride request. Please retry; no driver has been notified unless the request is confirmed.');
  }
  return data;
};


/* Authenticated client wrappers for the pickup and safety RPCs.
   These helpers do not imply that a staffed emergency response service is connected. */
window.lagosGoIssuePickupPin = async function (rideId) {
  const client = window.lagosGoSupabase;
  if (!client) throw new Error('Account service is still loading.');
  if (typeof rideId !== 'string' || !rideId.trim()) throw new Error('A valid ride ID is required.');
  const { data, error } = await client.rpc('lagosgo_issue_pickup_pin', { p_ride_id: rideId });
  if (error) throw new Error('Pickup PIN could not be issued. Confirm that the ride is accepted and belongs to your account.');
  return data;
};

window.lagosGoVerifyPickupPin = async function (rideId, pin) {
  const client = window.lagosGoSupabase;
  if (!client) throw new Error('Account service is still loading.');
  if (typeof rideId !== 'string' || !rideId.trim() || !/^\d{4}$/.test(String(pin || ''))) {
    throw new Error('Enter the four-digit pickup PIN and a valid ride ID.');
  }
  const { data, error } = await client.rpc('lagosgo_verify_pickup_pin', { p_ride_id: rideId, p_pin: String(pin) });
  if (error) throw new Error('Pickup PIN verification failed. Check the PIN and confirm that you have marked arrival.');
  if (data && data.ok === false) throw new Error(data.error === 'pickup_pin_incorrect'
    ? 'That pickup PIN is incorrect. Attempts remaining: ' + data.attempts_remaining
    : 'Pickup PIN verification failed.');
  return data;
};

window.lagosGoListMyActiveRides = async function () {
  const client = window.lagosGoSupabase;
  if (!client) throw new Error('Account service is still loading.');
  const { data, error } = await client.from('rides')
    .select('id,passenger_user_id,driver_user_id,status,pickup_label,destination_label,confirmed_fare_kobo,updated_at')
    .in('status',['accepted','driver_en_route','arrived','in_progress'])
    .order('updated_at',{ascending:false})
    .limit(10);
  if (error) throw new Error('Could not load your active trips. Please refresh and try again.');
  return Array.isArray(data) ? data : [];
};

window.lagosGoAdvanceRide = async function (rideId, nextStatus, reason = null) {
  const client = window.lagosGoSupabase;
  const allowed = ['driver_en_route','arrived','in_progress','completed'];
  if (!client) throw new Error('Account service is still loading.');
  if (typeof rideId !== 'string' || !rideId.trim() || !allowed.includes(nextStatus)) throw new Error('A valid ride and trip status are required.');
  const { data, error } = await client.rpc('lagosgo_advance_ride', { p_ride_id: rideId, p_next_status: nextStatus, p_reason: reason });
  if (error) throw new Error('Trip status could not be updated. Confirm you are the assigned driver and retry.');
  return data;
};

window.lagosGoReportSafetyIncident = async function ({ rideId = null, incidentType = 'other', description } = {}) {
  const client = window.lagosGoSupabase;
  if (!client) throw new Error('Account service is still loading.');
  const allowed = ['emergency', 'unsafe_driving', 'harassment', 'payment_dispute', 'route_concern', 'other'];
  if (!allowed.includes(incidentType)) throw new Error('Choose a valid incident category.');
  const detail = String(description || '').trim();
  if (!detail || detail.length > 4000) throw new Error('Describe the incident in 1–4,000 characters.');
  const { data, error } = await client.rpc('lagosgo_report_safety_incident', {
    p_ride_id: rideId,
    p_incident_type: incidentType,
    p_description: detail
  });
  if (error) throw new Error('The safety report could not be submitted. If you are in immediate danger, contact local emergency services directly.');
  return data;
};

/* Driver dispatch inbox: authenticated RPCs; callers should refresh while the driver is online. */
window.lagosGoListDispatchOffers = async function () {
  const client = window.lagosGoSupabase;
  if (!client) throw new Error('Account service is still loading.');
  const { data, error } = await client.rpc('lagosgo_list_my_dispatch_offers');
  if (error) throw new Error('Could not load driver offers. Confirm that this is an approved driver account.');
  return data && Array.isArray(data.offers) ? data.offers : [];
};

window.lagosGoRespondToDispatchOffer = async function (offerId, action) {
  const client = window.lagosGoSupabase;
  if (!client) throw new Error('Account service is still loading.');
  if (typeof offerId !== 'string' || !offerId.trim() || !['accept','decline'].includes(action)) {
    throw new Error('A valid dispatch offer and accept/decline action are required.');
  }
  const { data, error } = await client.rpc('lagosgo_respond_to_dispatch_offer', {
    p_offer_id: offerId,
    p_action: action
  });
  if (error) throw new Error(error.message && error.message.includes('dispatch_offer_expired_or_closed')
    ? 'This offer has expired or another driver has already accepted the ride.'
    : 'LagosGo could not process this driver response. Please refresh your offers.');
  return data;
};
