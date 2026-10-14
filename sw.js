const CACHE_NAME = "lagosgo-shell-v3";
const APP_SHELL = ["/", "/index.html", "/styles.css", "/app.js", "/manifest.webmanifest", "/icons/lagosgo-192.svg", "/icons/lagosgo-512.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("lagosgo-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  // Never cache dynamic API responses, credentials/config, route estimates, or lead submissions.
  if (new URL(request.url).pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put("/index.html", response.clone()));
      return response;
    }).catch(() => caches.match("/index.html")));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
// Cached shell only. Live bookings, dispatch, tracking, authentication, payments and push alerts are not available offline.

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (_error) { payload = { body: event.data ? event.data.text() : "" }; }
  const title = typeof payload.title === "string" ? payload.title : "LagosGo ride update";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "You have a new LagosGo update.",
    icon: "/icons/lagosgo-192.svg",
    badge: "/icons/lagosgo-192.svg",
    data: { url: typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/" },
    tag: typeof payload.tag === "string" ? payload.tag : "lagosgo-update"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data && event.notification.data.url || "/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => client.url.startsWith(self.location.origin) && "focus" in client);
    if (existing) {
      if ("navigate" in existing) existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  }));
});
