// PWA Service Worker Registration and Management
export const registerServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered successfully:', registration);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, prompt user to refresh
              showUpdateNotification();
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Wake Lock API for keeping screen active during workouts
export const requestWakeLock = async (): Promise<WakeLockSentinel | null> => {
  if ('wakeLock' in navigator) {
    try {
      const wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake lock active');
      return wakeLock;
    } catch (error) {
      console.error('Wake lock failed:', error);
      return null;
    }
  }
  return null;
};

export const releaseWakeLock = (wakeLock: WakeLockSentinel | null): void => {
  if (wakeLock) {
    wakeLock.release();
    console.log('Wake lock released');
  }
};

// Install PWA prompt - move deferredPrompt to module scope
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const showInstallPrompt = (): void => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    showInstallButton();
  });
};

const showInstallButton = (): void => {
  // Show install button in your UI
  const installButton = document.createElement('button');
  installButton.textContent = 'Install App';
  installButton.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg';
  installButton.onclick = () => {
    // Trigger install prompt
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        deferredPrompt = null;
        installButton.remove();
      });
    }
  };
  document.body.appendChild(installButton);
};

const showUpdateNotification = (): void => {
  // Create update notification
  const updateNotification = document.createElement('div');
  updateNotification.className = 'fixed top-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50';
  updateNotification.innerHTML = `
    <p class="mb-2">New version available!</p>
    <button onclick="window.location.reload()" class="bg-white text-blue-600 px-3 py-1 rounded mr-2">Update</button>
    <button onclick="this.parentElement.remove()" class="text-blue-200">Later</button>
  `;
  document.body.appendChild(updateNotification);
};

// Background sync for workout data
export const scheduleBackgroundSync = async (tag: string): Promise<void> => {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      // Type assertion since sync might not be in the standard types yet
      const syncReg = registration as any;
      if (syncReg.sync) {
        await syncReg.sync.register(tag);
      }
    } catch (error) {
      console.warn('Background sync not supported:', error);
    }
  }
};

// Push notifications for workout reminders
export const requestNotificationPermission = async (): Promise<boolean> => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export const scheduleWorkoutReminder = (workoutTime: Date, workoutName: string): void => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const timeDiff = workoutTime.getTime() - Date.now();
    
    if (timeDiff > 0) {
      setTimeout(() => {
        new Notification(`Workout Reminder: ${workoutName}`, {
          body: 'Time for your scheduled workout!',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        });
      }, timeDiff);
    }
  }
};

// Timer persistence for background handling
export const saveTimerState = (timerId: string, startTime: number, duration: number): void => {
  localStorage.setItem(`timer_${timerId}`, JSON.stringify({
    startTime,
    duration,
    savedAt: Date.now()
  }));
};

export const restoreTimerState = (timerId: string): { elapsed: number; remaining: number } | null => {
  const saved = localStorage.getItem(`timer_${timerId}`);
  if (saved) {
    const { startTime, duration } = JSON.parse(saved);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, duration - elapsed);
    
    return { elapsed, remaining };
  }
  return null;
};

export const clearTimerState = (timerId: string): void => {
  localStorage.removeItem(`timer_${timerId}`);
};

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
  }
}