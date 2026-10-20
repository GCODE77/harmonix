/* 하모닉스 서비스 워커 (v129) — 홈 화면에 앱처럼 설치하고, 인터넷이 끊겨도 마지막으로 연 화면이 열리게 한다.
   네트워크 우선(항상 최신 판을 받고), 실패하면 저장해 둔 것을 낸다. 다른 주소(악기 샘플 CDN 등)는 건드리지 않는다. */
const CACHE='harmonix-v129';
const ASSETS=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./favicon.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{ if(r&&r.ok){ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); } return r; })
    .catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html'))));
});
