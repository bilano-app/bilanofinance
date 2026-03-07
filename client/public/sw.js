self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // RADAR: Tangkap kiriman struk dari Share Menu HP
    if (event.request.method === 'POST' && url.pathname === '/share-target') {
        event.respondWith((async () => {
            try {
                const formData = await event.request.formData();
                const file = formData.get('image');
                
                if (file) {
                    // Simpan file gambar ke Brankas Browser (Cache)
                    const cache = await caches.open('bilano-shared-image');
                    await cache.put('/shared-image', new Response(file));
                }
                
                // Lempar pengguna langsung ke halaman Scan
                return Response.redirect('/scan', 303);
            } catch (error) {
                return Response.redirect('/scan', 303);
            }
        })());
    }
});