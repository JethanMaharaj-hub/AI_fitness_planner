# Mobile Architecture Deep Dive: Technical Implementation Guide

## Overview
This document provides detailed technical specifications for implementing the React Native mobile app with Apple Watch integration, complementing the main migration plan.

## Table of Contents
1. [Component Architecture](#component-architecture)
2. [Apple Watch Implementation Details](#apple-watch-implementation-details)
3. [Timer System Architecture](#timer-system-architecture)
4. [Data Synchronization Strategy](#data-synchronization-strategy)
5. [Performance Optimization](#performance-optimization)
6. [Code Examples](#code-examples)

---

## Component Architecture

### Navigation Structure
```typescript
// navigation/AppNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1f2937',
          borderTopColor: '#374151',
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <UserIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Generate" 
        component={GenerateStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <GenerateIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Workout" 
        component={WorkoutStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <WorkoutIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <HistoryIcon size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
```

### Screen Component Structure
```typescript
// screens/WorkoutScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WorkoutPlan, WorkoutDay } from '../types';
import { validateWorkoutPlanForGoals } from '../services/geminiService';
import { WatchConnectivity } from '../services/WatchConnectivity';

interface WorkoutScreenProps {
  route: any;
  navigation: any;
}

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({ route, navigation }) => {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [plan] = useState<WorkoutPlan>(route.params?.plan);
  
  const handleStartWorkout = async (day: WorkoutDay) => {
    // Send workout to Apple Watch
    await WatchConnectivity.sendWorkoutToWatch(day);
    
    // Navigate to active workout
    navigation.navigate('ActiveWorkout', { day });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{plan.planName}</Text>
      
      {/* Week Selector */}
      <View style={styles.weekSelector}>
        {Array.from({ length: plan.durationWeeks }, (_, i) => i + 1).map(week => (
          <TouchableOpacity
            key={week}
            style={[
              styles.weekButton,
              selectedWeek === week && styles.weekButtonActive
            ]}
            onPress={() => setSelectedWeek(week)}
          >
            <Text style={[
              styles.weekButtonText,
              selectedWeek === week && styles.weekButtonTextActive
            ]}>
              Week {week}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Workout Days */}
      {plan.days
        .filter(d => d.week === selectedWeek)
        .map((day, index) => (
          <TouchableOpacity
            key={index}
            style={styles.workoutCard}
            onPress={() => handleStartWorkout(day)}
          >
            <View style={styles.workoutHeader}>
              <Text style={styles.workoutTitle}>
                Day {day.day} - {day.focus}
              </Text>
              <Text style={styles.workoutDuration}>
                Est. {day.estimatedDurationMinutes || 60} mins
              </Text>
            </View>
          </TouchableOpacity>
        ))
      }
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 16,
  },
  weekSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  weekButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  weekButtonActive: {
    backgroundColor: '#3b82f6',
  },
  weekButtonText: {
    color: '#d1d5db',
    fontWeight: '600',
  },
  weekButtonTextActive: {
    color: '#ffffff',
  },
  workoutCard: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
    flex: 1,
  },
  workoutDuration: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
```

---

## Apple Watch Implementation Details

### WatchOS SwiftUI App Structure
```swift
// WatchWorkoutApp.swift
import SwiftUI
import WatchConnectivity
import HealthKit

@main
struct WatchWorkoutApp: App {
    @StateObject private var workoutManager = WatchWorkoutManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(workoutManager)
        }
    }
}

// ContentView.swift
struct ContentView: View {
    @EnvironmentObject var workoutManager: WatchWorkoutManager
    @State private var currentExercise: String = "No active workout"
    
    var body: some View {
        VStack {
            if workoutManager.isWorkoutActive {
                WorkoutActiveView()
            } else {
                WorkoutIdleView()
            }
        }
        .onAppear {
            workoutManager.setupWatchConnectivity()
        }
    }
}

// WorkoutActiveView.swift
struct WorkoutActiveView: View {
    @EnvironmentObject var workoutManager: WatchWorkoutManager
    
    var body: some View {
        VStack(spacing: 10) {
            // Timer Display
            Text(workoutManager.formattedTime)
                .font(.system(size: 32, weight: .bold, design: .monospaced))
                .foregroundColor(.white)
            
            // Current Exercise
            Text(workoutManager.currentExercise)
                .font(.headline)
                .multilineTextAlignment(.center)
                .foregroundColor(.blue)
            
            // Heart Rate
            HStack {
                Image(systemName: "heart.fill")
                    .foregroundColor(.red)
                Text("\(Int(workoutManager.heartRate)) BPM")
                    .font(.caption)
            }
            
            // Controls
            HStack(spacing: 20) {
                Button("Pause") {
                    workoutManager.pauseWorkout()
                }
                .foregroundColor(.yellow)
                
                Button("Stop") {
                    workoutManager.stopWorkout()
                }
                .foregroundColor(.red)
            }
        }
        .onAppear {
            workoutManager.startHeartRateMonitoring()
        }
    }
}
```

### Watch Connectivity Manager
```swift
// WatchWorkoutManager.swift
import Foundation
import WatchConnectivity
import HealthKit
import Combine

class WatchWorkoutManager: NSObject, ObservableObject {
    @Published var isWorkoutActive: Bool = false
    @Published var currentExercise: String = ""
    @Published var timeRemaining: Int = 0
    @Published var heartRate: Double = 0
    
    private var session: WCSession?
    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var timer: Timer?
    
    override init() {
        super.init()
        setupWatchConnectivity()
        requestHealthKitPermissions()
    }
    
    func setupWatchConnectivity() {
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }
    
    func requestHealthKitPermissions() {
        let types: Set<HKSampleType> = [
            HKSampleType.quantityType(forIdentifier: .heartRate)!,
            HKSampleType.quantityType(forIdentifier: .activeEnergyBurned)!
        ]
        
        healthStore.requestAuthorization(toShare: types, read: types) { success, error in
            if success {
                print("HealthKit permissions granted")
            }
        }
    }
    
    func startWorkout(workoutData: [String: Any]) {
        guard let workoutType = workoutData["type"] as? String else { return }
        
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .functionalStrengthTraining
        configuration.locationType = .indoor
        
        do {
            workoutSession = try HKWorkoutSession(
                healthStore: healthStore, 
                configuration: configuration
            )
            builder = workoutSession?.associatedWorkoutBuilder()
            
            workoutSession?.delegate = self
            builder?.delegate = self
            
            workoutSession?.startActivity(with: Date())
            builder?.beginCollection(withStart: Date()) { success, error in
                DispatchQueue.main.async {
                    self.isWorkoutActive = success
                }
            }
            
            startTimer()
        } catch {
            print("Error starting workout: \(error)")
        }
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            DispatchQueue.main.async {
                if self.timeRemaining > 0 {
                    self.timeRemaining -= 1
                    self.sendTimerUpdateToPhone()
                }
            }
        }
    }
    
    func startHeartRateMonitoring() {
        let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
        let heartRateQuery = HKAnchoredObjectQuery(
            type: heartRateType,
            predicate: nil,
            anchor: nil,
            limit: HKObjectQueryNoLimit
        ) { query, samples, deletedObjects, anchor, error in
            self.processHeartRateSamples(samples)
        }
        
        heartRateQuery.updateHandler = { query, samples, deletedObjects, anchor, error in
            self.processHeartRateSamples(samples)
        }
        
        healthStore.execute(heartRateQuery)
    }
    
    private func processHeartRateSamples(_ samples: [HKSample]?) {
        guard let samples = samples as? [HKQuantitySample] else { return }
        
        for sample in samples {
            let heartRateValue = sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
            
            DispatchQueue.main.async {
                self.heartRate = heartRateValue
            }
        }
    }
    
    private func sendTimerUpdateToPhone() {
        guard let session = session, session.isReachable else { return }
        
        let message: [String: Any] = [
            "type": "TIMER_UPDATE",
            "timeRemaining": timeRemaining,
            "heartRate": heartRate
        ]
        
        session.sendMessage(message, replyHandler: nil) { error in
            print("Error sending timer update: \(error)")
        }
    }
    
    var formattedTime: String {
        let minutes = timeRemaining / 60
        let seconds = timeRemaining % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

// MARK: - WCSessionDelegate
extension WatchWorkoutManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        print("Watch session activated with state: \(activationState)")
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        DispatchQueue.main.async {
            switch message["type"] as? String {
            case "START_WORKOUT":
                if let workoutData = message["workout"] as? [String: Any] {
                    self.startWorkout(workoutData: workoutData)
                }
            case "PAUSE_WORKOUT":
                self.pauseWorkout()
            case "STOP_WORKOUT":
                self.stopWorkout()
            default:
                break
            }
        }
    }
    
    func pauseWorkout() {
        timer?.invalidate()
        // Send pause message to phone
    }
    
    func stopWorkout() {
        timer?.invalidate()
        isWorkoutActive = false
        workoutSession?.end()
        // Send stop message to phone
    }
}

// MARK: - HKWorkoutSessionDelegate
extension WatchWorkoutManager: HKWorkoutSessionDelegate {
    func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
        // Handle workout session state changes
    }
    
    func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        print("Workout session failed: \(error)")
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate  
extension WatchWorkoutManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        // Handle collected workout data
    }
    
    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {
        // Handle workout events
    }
}
```

---

## Timer System Architecture

### React Native Timer Component
```typescript
// components/mobile/MobileTimer.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { WatchConnectivity } from '../../services/WatchConnectivity';
import { BackgroundTimer } from '../../services/BackgroundTimer';

interface MobileTimerProps {
  durationMinutes: number;
  sectionName: string;
  onComplete?: () => void;
  syncWithWatch?: boolean;
}

export const MobileTimer: React.FC<MobileTimerProps> = ({ 
  durationMinutes, 
  sectionName, 
  onComplete,
  syncWithWatch = true 
}) => {
  const totalSeconds = durationMinutes * 60;
  const [timeRemaining, setTimeRemaining] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const backgroundTimerRef = useRef<BackgroundTimer>();
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    // Initialize background timer
    backgroundTimerRef.current = new BackgroundTimer(
      `${sectionName}-timer`,
      totalSeconds,
      (remaining) => setTimeRemaining(remaining),
      () => handleTimerComplete()
    );

    // Handle app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - sync with background timer
        syncFromBackground();
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - start background timer
        if (isActive) {
          backgroundTimerRef.current?.startBackground();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      stopTimer();
      backgroundTimerRef.current?.cleanup();
    };
  }, []);

  const syncFromBackground = () => {
    const backgroundState = backgroundTimerRef.current?.getState();
    if (backgroundState) {
      setTimeRemaining(backgroundState.remaining);
      setIsActive(backgroundState.isActive);
      if (backgroundState.remaining <= 0) {
        handleTimerComplete();
      }
    }
  };

  const startTimer = useCallback(() => {
    if (isFinished) return;
    
    setIsActive(true);
    
    // Sync with Apple Watch
    if (syncWithWatch) {
      WatchConnectivity.sendTimerCommand('start', {
        duration: timeRemaining,
        sectionName
      });
    }
    
    // Start local timer
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          handleTimerComplete();
          return 0;
        }
        return newTime;
      });
    }, 1000);
  }, [timeRemaining, isFinished, syncWithWatch, sectionName]);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    backgroundTimerRef.current?.pause();
    
    // Sync with Apple Watch
    if (syncWithWatch) {
      WatchConnectivity.sendTimerCommand('pause', {});
    }
  }, [syncWithWatch]);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    setTimeRemaining(totalSeconds);
    setIsFinished(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    backgroundTimerRef.current?.stop();
    
    // Sync with Apple Watch
    if (syncWithWatch) {
      WatchConnectivity.sendTimerCommand('stop', {});
    }
  }, [totalSeconds, syncWithWatch]);

  const handleTimerComplete = useCallback(() => {
    setIsActive(false);
    setIsFinished(true);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Play completion sound
    // Haptic feedback
    
    onComplete?.();
  }, [onComplete]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    return ((totalSeconds - timeRemaining) / totalSeconds) * 100;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{sectionName} Timer</Text>
        <Text style={styles.duration}>{durationMinutes} min</Text>
      </View>
      
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View 
          style={[
            styles.progressBar, 
            { 
              width: `${getProgress()}%`,
              backgroundColor: isFinished ? '#10b981' : '#3b82f6'
            }
          ]} 
        />
      </View>

      <View style={styles.timerDisplay}>
        <Text style={styles.timeText}>
          {formatTime(timeRemaining)}
        </Text>
        
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.button,
              isActive ? styles.pauseButton : styles.startButton,
              isFinished && styles.disabledButton
            ]}
            onPress={isActive ? pauseTimer : startTimer}
            disabled={isFinished}
          >
            <Text style={styles.buttonText}>
              {isFinished ? 'Done!' : isActive ? 'Pause' : 'Start'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={stopTimer}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#60a5fa',
  },
  duration: {
    fontSize: 14,
    color: '#9ca3af',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#4b5563',
    borderRadius: 3,
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  timerDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#ffffff',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: '#10b981',
  },
  pauseButton: {
    backgroundColor: '#f59e0b',
  },
  resetButton: {
    backgroundColor: '#4b5563',
  },
  disabledButton: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

---

## Performance Optimization

### Memory Management
```typescript
// utils/MemoryManager.ts
export class MemoryManager {
  private static instance: MemoryManager;
  private cache = new Map<string, any>();
  private readonly maxCacheSize = 100;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  set(key: string, value: any): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get(key: string): any {
    return this.cache.get(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### Background Processing
```typescript
// services/BackgroundTimer.ts
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class BackgroundTimer {
  private timerId: string;
  private duration: number;
  private onTick: (remaining: number) => void;
  private onComplete: () => void;
  private startTime: number | null = null;
  private pausedAt: number | null = null;

  constructor(
    timerId: string,
    duration: number,
    onTick: (remaining: number) => void,
    onComplete: () => void
  ) {
    this.timerId = timerId;
    this.duration = duration;
    this.onTick = onTick;
    this.onComplete = onComplete;
  }

  async startBackground(): Promise<void> {
    this.startTime = Date.now();
    await this.saveState();
  }

  async pause(): Promise<void> {
    this.pausedAt = Date.now();
    await this.saveState();
  }

  async stop(): Promise<void> {
    this.startTime = null;
    this.pausedAt = null;
    await AsyncStorage.removeItem(`timer_${this.timerId}`);
  }

  async getState(): Promise<{ remaining: number; isActive: boolean } | null> {
    try {
      const saved = await AsyncStorage.getItem(`timer_${this.timerId}`);
      if (!saved) return null;

      const { startTime, pausedAt, duration } = JSON.parse(saved);
      
      if (pausedAt) {
        const elapsed = (pausedAt - startTime) / 1000;
        return {
          remaining: Math.max(0, duration - elapsed),
          isActive: false
        };
      }

      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      
      return {
        remaining,
        isActive: remaining > 0
      };
    } catch (error) {
      console.error('Error getting timer state:', error);
      return null;
    }
  }

  private async saveState(): Promise<void> {
    try {
      const state = {
        startTime: this.startTime,
        pausedAt: this.pausedAt,
        duration: this.duration,
      };
      await AsyncStorage.setItem(`timer_${this.timerId}`, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  }

  cleanup(): void {
    this.stop();
  }
}
```

This technical deep dive provides the detailed implementation guidance needed to successfully migrate your web app to React Native with Apple Watch integration. The architecture ensures robust timer functionality, seamless device synchronization, and optimal performance across all platforms.

---

*Last Updated: [Current Date]*
*Version: 1.0*
*Author: AI Development Assistant*