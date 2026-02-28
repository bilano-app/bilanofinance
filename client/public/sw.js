self.addEventListener('push', e => {
    const data = e.data.json();
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/favicon.ico', // Ganti dengan path logo BILANO Anda jika ada
        vibrate: [200, 100, 200] // HP akan bergetar!
    });
});