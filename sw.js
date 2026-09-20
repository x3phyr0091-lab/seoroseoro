/* 서로서로 서비스워커 — v82 */
var CACHE = "seoroseoro-v91";
var ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

/* 설치: 기본 파일 미리 저장 */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
  );
});

/* 활성화: 옛날 캐시 전부 삭제 */
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k !== CACHE) return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* 요청 처리: 항상 네트워크 먼저 → 끊기면 캐시 */
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* 파이어베이스·폰트·CDN 같은 외부 요청은 건드리지 않음 */
  if (url.origin !== self.location.origin) return;

  /* index.html 은 브라우저 캐시를 건너뛰고 항상 새로 받아옴 (옛 화면이 뜨는 문제 방지) */
  var isDoc = req.mode === "navigate" || /(^|\/)(index\.html)?$/.test(url.pathname);
  var hit = isDoc ? new Request(req.url, { cache: "reload", credentials: "same-origin" }) : req;

  e.respondWith(
    fetch(hit)
      .then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          if (req.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        });
      })
  );
});
