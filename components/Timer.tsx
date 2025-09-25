
import React, { useState, useEffect, useCallback } from 'react';
import { ConditioningType } from '../types';
import { requestWakeLock, releaseWakeLock, saveTimerState, restoreTimerState, clearTimerState } from '../services/pwaService';

interface TimerProps {
  type: ConditioningType | 'For Time';
  durationMinutes: number;
}

const Timer: React.FC<TimerProps> = ({ type, durationMinutes }) => {
  const totalSeconds = durationMinutes * 60;
  const [time, setTime] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  // EMOM specific state
  const [currentRound, setCurrentRound] = useState(1);
  
  // Audio cue for EMOM
  const playBeep = useCallback(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A nice, clear beep
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  }, []);

  const reset = useCallback(() => {
    setIsActive(false);
    setIsFinished(false);
    setTime(totalSeconds);
    setCurrentRound(1);
    
    // Release wake lock when resetting
    if (wakeLock) {
      releaseWakeLock(wakeLock);
      setWakeLock(null);
    }
    
    // Clear any saved timer state
    clearTimerState(`${type}-conditioning-timer`);
  }, [totalSeconds, wakeLock, type]);

  useEffect(() => {
    reset();
  }, [type, durationMinutes, reset]);

  // Check for background timer state on component mount
  useEffect(() => {
    const checkBackgroundTimer = async () => {
      const savedState = restoreTimerState(`${type}-conditioning-timer`);
      if (savedState && savedState.remaining > 0) {
        setTime(savedState.remaining);
        // Recalculate current round for EMOM
        if (type === 'EMOM') {
          const elapsed = totalSeconds - savedState.remaining;
          setCurrentRound(Math.floor(elapsed / 60) + 1);
        }
      }
    };
    
    checkBackgroundTimer();
  }, [type, totalSeconds]);

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
      
      // Request wake lock to keep screen on during conditioning
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
          saveTimerState(`${type}-conditioning-timer`, Date.now() - (totalSeconds - newTime) * 1000, totalSeconds);
          
          if (newTime <= 0) {
            setIsActive(false);
            setIsFinished(true);
            playBeep();
            
            // Release wake lock when finished
            if (wakeLock) {
              releaseWakeLock(wakeLock);
              setWakeLock(null);
            }
            
            clearTimerState(`${type}-conditioning-timer`);
            return 0;
          }
          
          if (type === 'EMOM') {
            // If a minute has passed
            if (newTime % 60 === 0 && newTime !== 0) {
              setCurrentRound(prev => prev + 1);
              playBeep();
            }
          }
          
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isFinished, type, playBeep]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getEmomTime = () => {
    // time remaining within the current minute
    return 60 - (time % 60 === 0 && time > 0 ? 60 : time % 60);
  }

  const renderTimerDisplay = () => {
    if (type === 'EMOM') {
      return (
        <div className="relative text-center">
            <div className="text-7xl font-mono tracking-tighter text-white">
                {formatTime(getEmomTime())}
            </div>
            <div className="absolute top-0 right-0 text-lg bg-blue-500 text-white px-2 py-1 rounded-bl-lg">
                Round {currentRound} / {durationMinutes}
            </div>
            <div className="text-gray-400 mt-2">Total Time: {formatTime(totalSeconds - time)}</div>
        </div>
      );
    }
    // For AMRAP, For Time, etc.
    return (
      <div className="text-7xl font-mono tracking-tighter text-white">
        {formatTime(time)}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-auto my-4 text-center shadow-lg">
      <h3 className="text-2xl font-bold text-blue-400 mb-2">{type}</h3>
      <p className="text-gray-400 mb-4">{durationMinutes} Minutes</p>

      <div className="my-4">{renderTimerDisplay()}</div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={handleStartPause}
          disabled={isFinished}
          className={`px-8 py-3 w-32 rounded-lg font-semibold text-lg ${isActive ? 'bg-yellow-500' : 'bg-green-500'} text-gray-900 transition-all transform hover:scale-105 disabled:bg-gray-700 disabled:opacity-50`}
        >
          {isFinished ? 'Done' : isActive ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="px-8 py-3 w-32 rounded-lg font-semibold text-lg bg-red-500 text-gray-900 transition-all transform hover:scale-105"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Timer;
