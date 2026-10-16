import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const message = document.querySelector("#authMessage");
const form = document.querySelector("#authForm");
const signInTab = document.querySelector("#signInTab");
const signUpTab = document.querySelector("#signUpTab");
const nameField = document.querySelector("#nameField");
const displayName = document.querySelector("#displayName");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const submitBtn = document.querySelector("#submitBtn");
const title = document.querySelector("#authTitle");
const intro = document.querySelector("#authIntro");
let mode = "signin";
let supabase;

function showMessage(text, error = false) {
  message.textContent = text;
  message.style.color = error ? "#a11b1b" : "#315d36";
}

function setMode(nextMode) {
  mode = nextMode;
  const signingUp = mode === "signup";
  signInTab.setAttribute("aria-pressed", String(!signingUp));
  signUpTab.setAttribute("aria-pressed", String(signingUp));
  nameField.hidden = !signingUp;
  displayName.required = signingUp;
  passwordInput.autocomplete = signingUp ? "new-password" : "current-password";
  submitBtn.textContent = signingUp ? "Create passenger account" : "Sign in securely";
  title.textContent = signingUp ? "Create your LagosGo account" : "Welcome to LagosGo";
  intro.textContent = signingUp ? "New accounts start with passenger access. Driver access requires verification." : "Sign in to manage your LagosGo account.";
  showMessage("");
}

signInTab.addEventListener("click", () => setMode("signin"));
signUpTab.addEventListener("click", () => setMode("signup"));

async function initialise() {
  const response = await fetch("/api/auth/config", { cache: "no-store" });
  if (!response.ok) throw new Error("LagosGo authentication is not configured yet.");
  const config = await response.json();
  supabase = createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const { data } = await supabase.auth.getSession();
  if (data.session) window.location.replace("/account.html");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase) return showMessage("Authentication is not configured. Please try again later.", true);
  submitBtn.disabled = true;
  showMessage(mode === "signup" ? "Creating your account…" : "Signing you in…");
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: displayName.value.trim() } }
      });
      if (error) throw error;
      if (data.session) window.location.replace("/account.html");
      else showMessage("Account created. Check your email to confirm your address, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.replace("/account.html");
    }
  } catch (error) {
    showMessage(error?.message || "Sign-in failed. Please try again.", true);
  } finally {
    submitBtn.disabled = false;
  }
});

initialise().catch((error) => showMessage(error.message || "Authentication could not start.", true));