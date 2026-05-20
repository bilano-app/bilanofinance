self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    clients.claim();
});

// 🚀 RADAR 1: Tangkap kiriman struk dari Share Menu HP
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
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

// 🚀 RADAR 2: Tangkap Klik Notifikasi (Sangat Wajib untuk PWA Android!)
self.addEventListener('notificationclick', (event) => {
    // Tutup jendela notifikasi di atas layar
    event.notification.close();

    // Membuka aplikasi BILANO
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Jika aplikasi BILANO sudah terbuka di background, fokuskan/tarik ke depan
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Jika aplikasi tertutup sepenuhnya, buka jendela baru
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});