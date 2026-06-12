import { useEffect, useCallback } from 'react';

// Fungsi bantuan untuk menembak API tanpa memblokir UI
const sendTrackEvent = (eventName: string, properties: any = {}) => {
  try {
    const sessionId = localStorage.getItem('bilano_session_id');
    const igUser = localStorage.getItem('bilano_ig_source');
    
    // Ambil UTM dan User ID kalau ada
    const utmDataStr = localStorage.getItem('bilano_utm');
    const utmData = utmDataStr ? JSON.parse(utmDataStr) : {};
    
    // Untuk cek auth dan ID (kalau sudah login)
    const storedUser = localStorage.getItem('bilano_user_id'); 
    const userId = storedUser ? parseInt(storedUser) : null;

    if (!sessionId) return; // Belum init

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        session_id: sessionId,
        user_id: userId,
        ig_user: igUser === 'null' ? null : igUser,
        utm_source: utmData.utm_source || null,
        utm_medium: utmData.utm_medium || null,
        properties: properties,
        timestamp: new Date().toISOString()
      }),
      keepalive: true // Pastikan event terkirim meski app ditutup
    }).catch(() => {});
  } catch (err) {
    // Silent fail
  }
};

export function useTrackingInit() {
  useEffect(() => {
    // 1. Baca URL Parameters saat aplikasi dibuka
    const params = new URLSearchParams(window.location.search);
    const igUserParam = params.get('ig_user');
    const sourceParam = params.get('utm_source');
    const mediumParam = params.get('utm_medium');
    const campaignParam = params.get('utm_campaign');

    // 2. Cek apakah session_id sudah ada
    let sessionId = localStorage.getItem('bilano_session_id');
    const isReturningSession = !!sessionId;

    if (!sessionId) {
      sessionId = crypto.randomUUID(); // Generate UUID v4
      localStorage.setItem('bilano_session_id', sessionId);
    }

    // 3. Simpan IG Source & UTM (jangan ditimpa kalau sudah ada di sesi ini)
    if (!localStorage.getItem('bilano_ig_source')) {
      localStorage.setItem('bilano_ig_source', igUserParam || 'null');
    }
    
    if (!localStorage.getItem('bilano_utm') && (sourceParam || mediumParam)) {
      localStorage.setItem('bilano_utm', JSON.stringify({
        utm_source: sourceParam,
        utm_medium: mediumParam,
        utm_campaign: campaignParam
      }));
    }

    // 4. Catat landing visit (hanya sekali per app load)
    if (!sessionStorage.getItem('bilano_tracked_landing')) {
      sessionStorage.setItem('bilano_tracked_landing', 'true');
      sendTrackEvent('landing_visit', {
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        screen_width: window.innerWidth,
        is_returning_session: isReturningSession
      });
    }

    // 5. Pantau PWA Install Events
    const handleBeforeInstallPrompt = (e: any) => {
      sendTrackEvent('pwa_install_prompt', { platform: navigator.platform });
    };

    const handleAppInstalled = () => {
      sendTrackEvent('pwa_installed', { platform: navigator.platform });
    };

    // 6. Pantau App Open (Visibility / Masuk ke background-foreground)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
        sendTrackEvent('session_open', { 
          screen_name: window.location.pathname,
          is_pwa_mode: isStandalone
        });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

// Hook untuk digunakan di dalam komponen lain
export function useTracking() {
  const track = useCallback((eventName: string, properties?: object) => {
    sendTrackEvent(eventName, properties);
  }, []);

  return { track };
}