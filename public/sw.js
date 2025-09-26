const CACHE_NAME = 'ai-fitness-planner-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch(error => {
          console.warn('Failed to cache some resources:', error);
          // Cache what we can
          return Promise.allSettled(urlsToCache.map(url => cache.add(url)));
        });
      })
  );
  self.skipWaiting();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        return fetch(event.request).catch((error) => {
          console.log('Network fetch failed:', error);
          // If network fails, return cached root for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
          // For other resources, return a basic error response instead of undefined
          return new Response('Resource not available offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Background sync for workout data
self.addEventListener('sync', (event) => {
  if (event.tag === 'workout-sync') {
    event.waitUntil(syncWorkoutData());
  }
});

async function syncWorkoutData() {
  // Sync pending workouts when connection is restored
  const pendingWorkouts = await getFromIndexedDB('pending-workouts');
  if (pendingWorkouts && pendingWorkouts.length > 0) {
    // Sync with Supabase
    for (const workout of pendingWorkouts) {
      try {
        await syncToSupabase(workout);
        await removeFromIndexedDB('pending-workouts', workout.id);
      } catch (error) {
        console.error('Failed to sync workout:', error);
      }
    }
  }
}

// Notification handling for workout reminders
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Helper functions for IndexedDB operations
async function getFromIndexedDB(storeName) {
  // Implementation for offline data retrieval
}

async function removeFromIndexedDB(storeName, id) {
  // Implementation for cleaning synced data
}

async function syncToSupabase(data) {
  // Implementation for syncing with your Supabase backend
}