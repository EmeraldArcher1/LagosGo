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
    client.auth.getSession().then(({ data }) => updateSession(data.session));
    client.auth.onAuthStateChange((_event, session) => updateSession(session));
  }
  initialise();
})();
