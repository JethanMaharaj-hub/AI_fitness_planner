import React, { useState, useEffect } from 'react';

const PWATestingPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState({
    serviceWorker: false,
    wakeLock: false,
    notification: false,
    storage: false,
    installable: false
  });

  useEffect(() => {
    // Only show in development
    if (import.meta.env.DEV) {
      runPWATests();
    }
  }, []);

  const runPWATests = async () => {
    const results = { ...testResults };

    // Test Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        results.serviceWorker = !!registration;
      } catch (error) {
        console.error('Service Worker test failed:', error);
      }
    }

    // Test Wake Lock API
    results.wakeLock = 'wakeLock' in navigator;

    // Test Notification API
    results.notification = 'Notification' in window;

    // Test Local Storage
    try {
      localStorage.setItem('pwa-test', 'test');
      localStorage.removeItem('pwa-test');
      results.storage = true;
    } catch (error) {
      results.storage = false;
    }

    // Test Install Prompt
    results.installable = 'BeforeInstallPromptEvent' in window;

    setTestResults(results);
  };

  const testWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const wakeLock = await (navigator as any).wakeLock.request('screen');
        alert('✅ Wake Lock acquired! Screen will stay on.');
        setTimeout(() => {
          wakeLock.release();
          alert('✅ Wake Lock released! Screen can dim again.');
        }, 5000);
      } catch (error) {
        alert('❌ Wake Lock failed: ' + error);
      }
    } else {
      alert('❌ Wake Lock not supported in this browser');
    }
  };

  const testNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('🏋️ PWA Test', {
          body: 'Notifications are working!',
          icon: '/icon-192.png'
        });
        alert('✅ Notification sent! Check your notifications.');
      } else {
        alert('❌ Notification permission denied');
      }
    } else {
      alert('❌ Notifications not supported');
    }
  };

  const testOfflineMode = () => {
    alert('🔧 To test offline mode:\n1. Open DevTools → Network\n2. Check "Offline"\n3. Refresh the page\n4. App should still work!');
  };

  const testServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        alert(`✅ Service Worker active!\nScope: ${registration.scope}\nState: ${registration.active?.state}`);
      } else {
        alert('❌ No Service Worker found');
      }
    }
  };

  // Only show in development mode
  if (!import.meta.env.DEV) return null;

  return (
    <>
      {/* Floating Test Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-20 right-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg z-50 transition-colors"
        title="PWA Testing Panel"
      >
        🧪
      </button>

      {/* Testing Panel */}
      {isVisible && (
        <div className="fixed inset-4 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-400">PWA Testing Panel</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Feature Detection */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-2 text-gray-200">Feature Detection</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className={`p-2 rounded ${testResults.serviceWorker ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                  {testResults.serviceWorker ? '✅' : '❌'} Service Worker
                </div>
                <div className={`p-2 rounded ${testResults.wakeLock ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                  {testResults.wakeLock ? '✅' : '❌'} Wake Lock API
                </div>
                <div className={`p-2 rounded ${testResults.notification ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                  {testResults.notification ? '✅' : '❌'} Notifications
                </div>
                <div className={`p-2 rounded ${testResults.storage ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                  {testResults.storage ? '✅' : '❌'} Local Storage
                </div>
              </div>
            </div>

            {/* Manual Tests */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-2 text-gray-200">Manual Tests</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  onClick={testServiceWorker}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm transition-colors"
                >
                  Test Service Worker
                </button>
                <button
                  onClick={testWakeLock}
                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded text-sm transition-colors"
                >
                  Test Wake Lock
                </button>
                <button
                  onClick={testNotifications}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded text-sm transition-colors"
                >
                  Test Notifications
                </button>
                <button
                  onClick={testOfflineMode}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded text-sm transition-colors"
                >
                  Test Offline Mode
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h4 className="text-lg font-semibold mb-2 text-gray-200">Testing Instructions</h4>
              <div className="text-sm text-gray-300 space-y-2">
                <div className="bg-gray-700 p-3 rounded">
                  <strong className="text-blue-400">Desktop (Chrome/Edge):</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Open DevTools → Application → Service Workers</li>
                    <li>Check for install icon in address bar</li>
                    <li>Test offline: Network tab → "Offline" → refresh</li>
                  </ul>
                </div>
                
                <div className="bg-gray-700 p-3 rounded">
                  <strong className="text-green-400">Mobile Testing:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Find your computer's IP address (ipconfig/ifconfig)</li>
                    <li>On phone: Visit http://YOUR_IP:5173</li>
                    <li>Look for "Add to Home Screen" option</li>
                    <li>Test timer wake lock functionality</li>
                  </ul>
                </div>

                <div className="bg-gray-700 p-3 rounded">
                  <strong className="text-purple-400">Timer Testing:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Start a section timer</li>
                    <li>Switch to another app/tab</li>
                    <li>Return after 30 seconds</li>
                    <li>Timer should have continued counting</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWATestingPanel;