import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const status = document.querySelector("#accountStatus");
const details = document.querySelector("#accountDetails");
const signOutBtn = document.querySelector("#signOutBtn");

async function start() {
  const configResponse = await fetch("/api/auth/config", { cache: "no-store" });
  if (!configResponse.ok) throw new Error("LagosGo authentication is not configured yet.");
  const config = await configResponse.json();
  const supabase = createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    window.location.replace("/auth.html?next=%2Faccount.html");
    return;
  }

  const response = await fetch("/api/auth/me", {
    headers: { Authorization: "Bearer " + (await supabase.auth.getSession()).data.session.access_token },
    cache: "no-store"
  });
  if (!response.ok) {
    if (response.status === 401) {
      window.location.replace("/auth.html?next=%2Faccount.html");
      return;
    }
    throw new Error("We couldn't load your account details.");
  }
  const profile = await response.json();
  document.querySelector("#accountEmail").textContent = user.email || "Email not available";
  document.querySelector("#accountId").textContent = user.id;
  document.querySelector("#accountRole").textContent = profile.role || "passenger";
  details.hidden = false;
  status.textContent = "You are signed in.";
  signOutBtn.addEventListener("click", async () => {
    signOutBtn.disabled = true;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      status.textContent = "Sign-out failed. Please try again.";
      signOutBtn.disabled = false;
      return;
    }
    window.location.replace("/auth.html");
  });
}

start().catch((error) => {
  status.textContent = error.message || "Unable to verify your session.";
});