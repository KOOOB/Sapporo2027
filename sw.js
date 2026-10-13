const CACHE = 'sapporo2027-v1'; // bump when photos, PDFs or index.html change
const TILES = 'sapporo2027-tiles';
const TILE_LIMIT = 400;

const KEYS = ['hotel', 'susukino', 'ganso', 'zoo', 'odori', 'tvtower', 'hachikyo', 'buddha', 'nijo', 'ichigen',
  'biei', 'shirahige', 'bluepond', 'ningle', 'takino', 'moiwa', 'hanamaru', 'mil', 'tanuki', 'milkmura',
  'jingisukan', 'kani'];
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const PDFS = ['Confirmation_for_Booking_ID_%23_2045501999.pdf', 'GBBU5M-00-XJ620-Phimonphan.pdf',
  'GBBU5M-01-XJ621-Phimonphan.pdf', 'MD3HWZ-01-XJ621-Somphop.pdf', 'MFK4MD-00-XJ620-Somphop,%20Kham.pdf'].map(f => 'docs/' + f);
const PHOTOS = KEYS.flatMap(k => [1, 2, 3].map(n => `images/${k}/${n}.jpg`));
// Cross-origin assets the page needs; stored as opaque responses
const REMOTE = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block',
  'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=800&q=80'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    await Promise.allSettled([...PDFS, ...PHOTOS].map(u => c.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== TILES) await caches.delete(k);
    await self.clients.claim();
  })());
  // Best-effort, kept separate so a slow CDN never delays activation
  e.waitUntil(caches.open(CACHE).then(c =>
    // cache.add() rejects opaque responses, so fetch + put
    Promise.allSettled(REMOTE.map(async u => {
      if (await c.match(u)) return;
      await c.put(u, await fetch(u, { mode: 'no-cors' }));
    }))));
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - TILE_LIMIT; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isTile = new URL(req.url).hostname.endsWith('tile.openstreetmap.org');
  e.respondWith((async () => {
    const cache = await caches.open(isTile ? TILES : CACHE);
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') {
        cache.put(req, res.clone()).then(() => isTile && trim(cache));
      }
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
  })());
});
