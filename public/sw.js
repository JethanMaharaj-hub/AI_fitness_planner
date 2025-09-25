const CACHE_NAME = 'ai-fitness-planner-v1';
const urlsToCache = [
  '/',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/services/geminiService.ts',
  '/services/supabaseService.ts',
  '/services/supabaseClient.ts',
  '/components/Timer.tsx',
  '/components/SectionTimer.tsx',
  '/components/Loader.tsx',
  '/components/icons.tsx',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
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