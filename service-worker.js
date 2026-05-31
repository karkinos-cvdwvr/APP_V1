/* 여기봐봐 (YGBB) 서비스워커 — 오프라인 캐시 */
const CACHE = 'ygbb-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // POST(예: Gemini API) 등은 그대로 통과
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 외부 출처(CDN, Gemini)는 캐시하지 않고 통과
  if (url.origin !== self.location.origin) return;

  // HTML(네비게이션): 네트워크 우선 → 실패 시 캐시
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 그 외 동일 출처 GET(아이콘/매니페스트 등): 캐시 우선
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
