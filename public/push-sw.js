/* Web Push handlers — loaded by the Workbox service worker via importScripts */

self.addEventListener("push", function (event) {
  var payload = { title: "TSA Delivery", body: "", url: "/notifications", tag: "tsa-delivery" };

  try {
    if (event.data) {
      var parsed = event.data.json();
      payload.title = parsed.title || payload.title;
      payload.body = parsed.body || payload.body;
      payload.url = parsed.url || payload.url;
      payload.tag = parsed.tag || payload.tag;
    }
  } catch (_) {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag,
      data: { url: payload.url },
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || "/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
