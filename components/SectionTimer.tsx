import React, { useState, useEffect, useCallback } from 'react';
import { requestWakeLock, releaseWakeLock, saveTimerState, restoreTimerState, clearTimerState } from '../services/pwaService';

interface SectionTimerProps {
  durationMinutes: number;
  sectionName: string;
  onComplete?: () => void;
}

const SectionTimer: React.FC<SectionTimerProps> = ({ durationMinutes, sectionName, onComplete }) => {
  const totalSeconds = durationMinutes * 60;
  const [time, setTime] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Fallback for browsers that don't support Web Audio API
      console.log('Timer finished!');
    }
  }, []);

  const reset = useCallback(() => {
    setIsActive(false);
    setIsFinished(false);
    setTime(totalSeconds);
    // Release wake lock when resetting
    if (wakeLock) {
      releaseWakeLock(wakeLock);
      setWakeLock(null);
    }
    // Clear any saved timer state
    clearTimerState(`${sectionName}-timer`);
  }, [totalSeconds, wakeLock, sectionName]);

  useEffect(() => {
    reset();
  }, [durationMinutes, reset]);

  // Check for background timer state on component mount
  useEffect(() => {
    const checkBackgroundTimer = async () => {
      const savedState = restoreTimerState(`${sectionName}-timer`);
      if (savedState && savedState.remaining > 0) {
        setTime(savedState.remaining);
        // Don't auto-start, let user choose
      }
    };
    
    checkBackgroundTimer();
  }, [sectionName]);

  const handleStartPause = async () => {
    if (isActive) {
      // Pause timer
      setIsActive(false);
      if (wakeLock) {
        releaseWakeLock(wakeLock);
        setWakeLock(null);
      }
    } else if (!isFinished) {
      // Start timer
      setIsActive(true);
      
      // Request wake lock to keep screen on during workout
      try {
        const lock = await requestWakeLock();
        setWakeLock(lock);
      } catch (error) {
        console.warn('Wake lock failed:', error);
      }
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout> | null = null;
    if (isActive && !isFinished) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          const newTime = prevTime - 1;
          
          // Save timer state for background recovery
          saveTimerState(`${sectionName}-timer`, Date.now() - (totalSeconds - newTime) * 1000, totalSeconds);
          
          if (newTime <= 0) {
            setIsActive(false);
            setIsFinished(true);
            playBeep();
            
            // Release wake lock when finished
            if (wakeLock) {
              releaseWakeLock(wakeLock);
              setWakeLock(null);
            }
            
            clearTimerState(`${sectionName}-timer`);
            if (onComplete) onComplete();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isFinished, playBeep, onComplete, sectionName, totalSeconds, wakeLock]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getProgress = () => {
    return ((totalSeconds - time) / totalSeconds) * 100;
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4 my-3">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-lg font-semibold text-blue-300">{sectionName} Timer</h4>
        <span className="text-sm text-gray-400">{durationMinutes} min</span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
        <div 
          className={`h-2 rounded-full transition-all duration-1000 ${
            isFinished ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${getProgress()}%` }}
        />
      </div>

      <div className="flex justify-between items-center">
        <div className="text-2xl font-mono font-bold text-white">
          {formatTime(time)}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleStartPause}
            disabled={isFinished}
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${
              isActive 
                ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-600' 
                : 'bg-green-500 text-gray-900 hover:bg-green-600'
            } transition-colors disabled:bg-gray-600 disabled:text-gray-400`}
          >
            {isFinished ? 'Done!' : isActive ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg font-semibold text-sm bg-gray-600 text-gray-200 hover:bg-gray-500 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default SectionTimer;