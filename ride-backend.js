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
      setStatus('You are signed in. Live ride booking is not enabled yet.');
    } else {
      setMode(false);
      modeToggle.hidden = false;
      submit.hidden = false;
      signOut.hidden = true;
    }
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  window.lagosGoOpenAuth = openAuth;

  document.getElementById('authClose').addEventListener('click', () => dialog.close());
  modeToggle.addEventListener('click', () => setMode(!isSignUp));
  signOut.addEventListener('click', async () => {
    if (!client) return;
    signOut.disabled = true;
    const { error } = await client.auth.signOut();
    signOut.disabled = false;
    if (error) return setStatus('Could not sign out. Please try again.', true);
    setStatus('You have signed out.');
    dialog.close();
  });

  function updateSession(session) {
    currentSession = session;
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
  if (typeof rideId !== 'string' || !rideId.trim() || !/^\\d{4}$/.test(String(pin || ''))) {
    throw new Error('Enter the four-digit pickup PIN and a valid ride ID.');
  }
  const { data, error } = await client.rpc('lagosgo_verify_pickup_pin', { p_ride_id: rideId, p_pin: String(pin) });
  if (error) throw new Error('Pickup PIN verification failed. Check the PIN and confirm that you have marked arrival.');
  if (data && data.ok === false) throw new Error(data.error === 'pickup_pin_incorrect'
    ? 'That pickup PIN is incorrect. Attempts remaining: ' + data.attempts_remaining
    : 'Pickup PIN verification failed.');
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
