import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, onSnapshot, deleteDoc, updateDoc, addDoc, orderBy, where, serverTimestamp, getDocs } from 'firebase/firestore';
import * as Tone from 'tone'; // Import Tone.js as a namespace

// --- Custom Hook for Swipe Gestures ---
const useSwipeGesture = (onSwipeLeft, onSwipeRight, threshold = 80) => {
  const [startX, setStartX] = useState(null);
  const [currentX, setCurrentX] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isSwiping || startX === null || currentX === null) return;

    const diff = startX - currentX;
    const absDiff = Math.abs(diff);

    if (absDiff > threshold) {
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      if (diff > 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (diff < 0 && onSwipeRight) {
        onSwipeRight();
      }
    }

    setStartX(null);
    setCurrentX(null);
    setIsSwiping(false);
  };

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    swipeOffset: startX && currentX ? startX - currentX : 0,
    isSwiping
  };
};

// --- Swipeable Item Component ---
const SwipeableItem = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  leftAction = 'Delete', 
  rightAction = 'Complete',
  leftColor = 'bg-red-500',
  rightColor = 'bg-green-500',
  className = ''
}) => {
  const { touchHandlers, swipeOffset, isSwiping } = useSwipeGesture(onSwipeLeft, onSwipeRight);
  
  const transform = `translateX(${swipeOffset}px)`;
  const opacity = Math.min(Math.abs(swipeOffset) / 100, 1);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background Actions */}
      <div className="absolute inset-0 flex">
        <div 
          className={`flex items-center justify-center px-4 text-white font-bold transition-opacity duration-200 ${
            swipeOffset > 0 ? rightColor : 'bg-transparent'
          }`}
          style={{ 
            width: '25%', 
            opacity: swipeOffset > 0 ? opacity : 0 
          }}
        >
          {rightAction}
        </div>
        <div className="flex-1"></div>
        <div 
          className={`flex items-center justify-center px-4 text-white font-bold transition-opacity duration-200 ${
            swipeOffset < 0 ? leftColor : 'bg-transparent'
          }`}
          style={{ 
            width: '25%', 
            opacity: swipeOffset < 0 ? opacity : 0 
          }}
        >
          {leftAction}
        </div>
      </div>
      
      {/* Content */}
      <div 
        className="relative bg-[#0F0F0F] transition-transform duration-200 ease-out touch-pan-y"
        style={{ transform }}
        {...touchHandlers}
      >
        {children}
      </div>
    </div>
  );
};

// Firebase configuration and initialization
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = process.env.REACT_APP_FIREBASE_APP_ID || 'default-app-id';

// Utility function for dot grid background
const DotGridBackground = ({ children }) => (
  <div className="min-h-screen bg-[#0F0F0F] text-[#D1D1D1] font-mono"
       style={{
         backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)',
         backgroundSize: '20px 20px'
       }}>
    {children}
  </div>
);

// Button component with consistent styling
const NeonButton = ({ onClick, children, className = '', ...props }) => (
  <button
    onClick={onClick}
    {...props}
    className={`bg-[#FF3C00] text-white uppercase px-6 py-3 rounded-br-xl shadow-lg hover:shadow-orange-500/50
                transition-all duration-300 ease-in-out transform hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-[#FF3C00] focus:ring-opacity-75
                text-lg md:text-xl font-extrabold tracking-wide
                md:px-8 md:py-4
                w-full max-w-xs mx-auto block
                ${className}`}
  >
    {children}
  </button>
);

// Card component with consistent styling
const Card = ({ children, className = '' }) => (
  <div className={`bg-[#1a1a1a] p-4 md:p-6 rounded-br-xl shadow-lg border border-[#333] ${className}`}>
    {children}
  </div>
);

// Modal component for alerts/confirmations
const Modal = ({ isOpen, onClose, title, message, onConfirm, showConfirm = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full text-center">
        <h3 className="text-xl text-[#FF3C00] font-bold mb-4">{title}</h3>
        <p className="text-[#D1D1D1] mb-6">{message}</p>
        <div className="flex justify-center space-x-4">
          {showConfirm && <NeonButton onClick={onConfirm}>Confirm</NeonButton>}
          <NeonButton onClick={onClose}>Close</NeonButton>
        </div>
      </Card>
    </div>
  );
};

// Floating Action Button (FAB) component
const FAB = ({ onClick, label = 'Add', icon = '+', className = '' }) => (
  <button
    onClick={onClick}
    className={`fixed bottom-6 right-4 z-[100] bg-[#FF3C00] text-white rounded-full shadow-lg p-5 flex items-center justify-center text-3xl font-extrabold md:hidden transition-all duration-300 hover:scale-110 active:scale-95 ${className}`}
    aria-label={label}
    style={{ boxShadow: '0 4px 24px 0 rgba(255,60,0,0.25)' }}
  >
    {icon}
  </button>
);

// --- Homepage Component ---
const HomePage = ({ onEnterDashboard }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-6xl md:text-8xl font-extrabold text-[#FF3C00] uppercase tracking-widest mb-6 animate-pulse">
        FocusForge
      </h1>
      <p className="text-xl md:text-2xl text-[#D1D1D1] mb-10 max-w-2xl leading-relaxed">
        Unleash your potential with precision tools for ultimate concentration and productivity.
      </p>
      {/* Plan-Act-Review Framework Explanation */}
      <div className="bg-[#181818] border border-[#333] rounded-xl shadow-lg p-6 mb-10 max-w-2xl text-left">
        <h2 className="text-2xl font-bold text-[#FF3C00] mb-2">Why Plan-Act-Review?</h2>
        <p className="text-[#D1D1D1] mb-2">
          The <span className="font-bold text-[#FF3C00]">Plan-Act-Review</span> framework is a proven, science-backed approach to personal productivity and growth. It breaks down your workflow into three essential phases:
        </p>
        <ul className="list-disc pl-6 mb-2 text-[#D1D1D1]">
          <li><span className="font-bold text-[#FF3C00]">Plan</span>: Set clear intentions, organize your schedule, and define actionable goals before you start.</li>
          <li><span className="font-bold text-[#FF3C00]">Act</span>: Focus deeply on your tasks using evidence-based methods like the Pomodoro technique and audio tools.</li>
          <li><span className="font-bold text-[#FF3C00]">Review</span>: Reflect on your progress, capture insights, and adjust your strategy for continuous improvement.</li>
        </ul>
        <p className="text-[#D1D1D1]">
          This cycle is effective because it creates a feedback loop: you plan with intention, act with focus, and review with honesty. This not only boosts productivity, but also builds self-awareness and resilience. By using FocusForge, you're leveraging a framework used by top performers, athletes, and creators worldwide.
        </p>
      </div>
      <NeonButton onClick={onEnterDashboard}>
        Enter Dashboard
      </NeonButton>
    </div>
  );
};

// --- Pomodoro Timer Component ---
const PomodoroTimer = ({ userId, db }) => {
  const [pomodoroDuration, setPomodoroDuration] = useState(25); // Default to 25 minutes
  const [shortBreakDuration, setShortBreakDuration] = useState(5); // Default short break
  const [longBreakDuration, setLongBreakDuration] = useState(15); // Default long break
  const [pomodorosUntilLongBreak, setPomodorosUntilLongBreak] = useState(4); // Default 4 pomodoros
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isLongBreak, setIsLongBreak] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const [modalConfirmAction, setModalConfirmAction] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showFocusScore, setShowFocusScore] = useState(false);
  const [focusScore, setFocusScore] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [scheduledEvents, setScheduledEvents] = useState([]); // For Scheduler integration
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);

  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const tasksCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tasks`);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      return permission === 'granted';
    }
    return false;
  };

  // Send notification
  const sendNotification = (title, body) => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true
      });
    }
  };

  // Play sound effect
  const playSound = (type) => {
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'timer') {
      // Timer completion sound - ascending tone
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.5);
      oscillator.type = 'sine';
    } else if (type === 'task') {
      // Task completion sound - success chime
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
      oscillator.type = 'triangle';
    }
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  useEffect(() => {
    // Update minutes when pomodoroDuration changes, only if not active
    if (!isActive) {
      setMinutes(pomodoroDuration);
      setSeconds(0);
    }
  }, [pomodoroDuration, isActive]);

  useEffect(() => {
    if (!userId) return;

    const q = query(tasksCollectionRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(fetchedTasks);
    }, (error) => {
      console.error("Error fetching tasks:", error);
      setModalContent({ title: 'Error', message: 'Failed to load tasks. Please try again.' });
      setShowModal(true);
    });

    return () => unsubscribe();
  }, [userId, db]);

  // Fetch today's scheduled events
  useEffect(() => {
    if (!userId) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const eventsRef = collection(db, `artifacts/${appId}/users/${userId}/scheduledEvents`);
    const q = query(eventsRef, where('date', '==', todayStr));
    const unsub = onSnapshot(q, (snap) => {
      setScheduledEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [userId, db]);

    useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(timerRef.current);
            setIsActive(false);
            
            if (!isBreak) {
              // Pomodoro completed
              const newCompletedPomodoros = completedPomodoros + 1;
              setCompletedPomodoros(newCompletedPomodoros);
              
              // Check if it's time for a long break
              const shouldTakeLongBreak = newCompletedPomodoros % pomodorosUntilLongBreak === 0;
              
              // Update session in database
              if (currentSessionId) {
                updateDoc(doc(db, `artifacts/${appId}/users/${userId}/pomodoroSessions`, currentSessionId), {
                  completed: true,
                  endTime: new Date(),
                  duration: pomodoroDuration
                });
              }
              
              // Show focus score dialog
              setShowFocusScore(true);
              
              // Play sound and send notification
              playSound('timer');
              sendNotification(
                'Pomodoro Complete!',
                shouldTakeLongBreak ? 'Great work! Time for a long break.' : 'Take a short break or continue working.'
              );
              
              setModalContent({
                title: 'Pomodoro Complete!',
                message: shouldTakeLongBreak ? 'Great work! Time for a long break.' : 'Take a short break or continue working.'
              });
              setShowModal(true);
              
              // Set up next break
              setIsBreak(true);
              setIsLongBreak(shouldTakeLongBreak);
              setMinutes(shouldTakeLongBreak ? longBreakDuration : shortBreakDuration);
              setSeconds(0);
            } else {
              // Break completed
              playSound('timer');
              sendNotification(
                isLongBreak ? 'Long Break Over!' : 'Break Over!',
                'Time to get back to work!'
              );
              
              setModalContent({
                title: isLongBreak ? 'Long Break Over!' : 'Break Over!',
                message: 'Time to get back to work!'
              });
              setShowModal(true);
              
              setIsBreak(false);
              setIsLongBreak(false);
              setMinutes(pomodoroDuration);
              setSeconds(0);
            }
          } else {
            setMinutes(prevMinutes => prevMinutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(prevSeconds => prevSeconds - 1);
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isActive, isPaused, minutes, seconds, isBreak, isLongBreak, pomodoroDuration, shortBreakDuration, longBreakDuration, completedPomodoros, pomodorosUntilLongBreak, currentSessionId, userId, db]);

  const toggleTimer = async () => {
    if (!isActive && !isPaused) {
      // Starting timer - record session start
      try {
        const sessionRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/pomodoroSessions`), {
          startTime: new Date(),
          duration: pomodoroDuration,
          isBreak: isBreak,
          isLongBreak: isLongBreak,
          completed: false,
          focusScore: null,
          taskId: selectedEventId || null // Link to Scheduler event if selected
        });
        setCurrentSessionId(sessionRef.id);
      } catch (e) {
        console.error("Error recording pomodoro session:", e);
      }
    }
    setIsActive(!isActive);
  };

  const pauseTimer = () => {
    setIsPaused(!isPaused);
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    setIsActive(false);
    setIsPaused(false);
    setIsBreak(false);
    setIsLongBreak(false);
    setMinutes(pomodoroDuration);
    setSeconds(0);
    setCurrentSessionId(null);
  };

  const startBreak = () => {
    clearInterval(timerRef.current);
    setIsActive(true);
    setIsPaused(false);
    setIsBreak(true);
    setIsLongBreak(false);
    setMinutes(shortBreakDuration);
    setSeconds(0);
  };

  const startLongBreak = () => {
    clearInterval(timerRef.current);
    setIsActive(true);
    setIsPaused(false);
    setIsBreak(true);
    setIsLongBreak(true);
    setMinutes(longBreakDuration);
    setSeconds(0);
  };

  const saveFocusScore = async () => {
    if (currentSessionId) {
      try {
        await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/pomodoroSessions`, currentSessionId), {
          focusScore: focusScore
        });
      } catch (e) {
        console.error("Error saving focus score:", e);
      }
    }
    setShowFocusScore(false);
    setFocusScore(5);
  };



  const addTask = async () => {
    if (newTask.trim() === '') {
      setModalContent({ title: 'Input Error', message: 'Task cannot be empty.' });
      setShowModal(true);
      return;
    }
    try {
      await addDoc(tasksCollectionRef, { text: newTask, completed: false, createdAt: new Date() });
      setNewTask('');
    } catch (e) {
      console.error("Error adding document: ", e);
      setModalContent({ title: 'Error', message: 'Failed to add task. Please try again.' });
      setShowModal(true);
    }
  };

  const toggleTaskCompletion = async (id, completed) => {
    try {
      const taskDocRef = doc(db, `artifacts/${appId}/users/${userId}/tasks`, id);
      await updateDoc(taskDocRef, { 
        completed: !completed,
        completedAt: !completed ? new Date() : null
      });
      
      // Play sound when task is completed
      if (!completed) {
        playSound('task');
      }
    } catch (e) {
      console.error("Error updating document: ", e);
      setModalContent({ title: 'Error', message: 'Failed to update task. Please try again.' });
      setShowModal(true);
    }
  };

  const deleteTask = (id) => {
    setModalContent({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this task?'
    });
    setModalConfirmAction(() => async () => {
      try {
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/tasks`, id));
        setShowConfirmModal(false);
      } catch (e) {
        console.error("Error deleting document: ", e);
        setModalContent({ title: 'Error', message: 'Failed to delete task. Please try again.' });
        setShowModal(true);
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const startEditingTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const saveEditedTask = async (id) => {
    if (editingTaskText.trim() === '') {
      setModalContent({ title: 'Input Error', message: 'Task cannot be empty.' });
      setShowModal(true);
      return;
    }
    try {
      const taskDocRef = doc(db, `artifacts/${appId}/users/${userId}/tasks`, id);
      await updateDoc(taskDocRef, { text: editingTaskText });
      setEditingTaskId(null);
      setEditingTaskText('');
    } catch (e) {
      console.error("Error saving edited task: ", e);
      setModalContent({ title: 'Error', message: 'Failed to save task. Please try again.' });
      setShowModal(true);
    }
  };

  const cancelEditingTask = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  return (
    <Card className="w-full h-full flex flex-col p-4 md:p-6">
      <h2 className="text-3xl text-[#FF3C00] font-bold mb-6 uppercase">Pomodoro Timer</h2>
      {/* Task selector */}
      {scheduledEvents.length > 0 && (
        <div className="mb-4">
          <label className="block text-[#FF3C00] text-lg mb-2">Focus on Scheduled Task</label>
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="w-full p-2 rounded-lg bg-[#1a1a1a] text-[#D1D1D1] border border-[#333]"
          >
            <option value="">-- None (Ad-hoc Pomodoro) --</option>
            {scheduledEvents.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title} ({ev.startTime}-{ev.endTime})</option>
            ))}
          </select>
        </div>
      )}

      {/* Pomodoro Duration Presets */}
      <div className="mb-6">
        <h3 className="text-xl text-[#FF3C00] font-bold mb-3">Pomodoro Duration:</h3>
        <div className="flex flex-wrap justify-center gap-3">
          {[25, 45, 60, 90].map(duration => (
            <button
              key={duration}
              onClick={() => setPomodoroDuration(duration)}
              className={`px-4 py-2 rounded-br-lg text-lg font-bold transition-colors duration-200
                          ${pomodoroDuration === duration ? 'bg-[#FF3C00] text-white' : 'bg-gray-700 text-[#D1D1D1] hover:bg-gray-600'}`}
              disabled={isActive}
            >
              {duration} min
            </button>
          ))}
        </div>
      </div>

      {/* Timer Display */}
      <div className="flex justify-center items-center mb-8">
        <div className={`text-6xl sm:text-7xl font-extrabold ${isBreak ? 'text-blue-400' : 'text-[#FF3C00]'}
                        bg-black p-6 md:p-8 rounded-xl shadow-inner shadow-black/50 border border-[#333]`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {/* Timer Controls */}
      <div className="flex justify-center space-x-2 sm:space-x-4 mb-8">
        <NeonButton onClick={toggleTimer}>
          {isActive ? (isPaused ? 'Resume' : 'Pause') : 'Start'}
        </NeonButton>
        {isActive && !isPaused && (
          <NeonButton onClick={pauseTimer}>Pause</NeonButton>
        )}
        <NeonButton onClick={resetTimer}>Reset</NeonButton>
        {!isBreak && (
          <>
            <NeonButton onClick={startBreak}>Short Break</NeonButton>
            <NeonButton onClick={startLongBreak}>Long Break</NeonButton>
          </>
        )}
      </div>

      {/* Session Info */}
      <div className="text-center mb-4">
        <div className="text-[#D1D1D1] text-lg">
          Completed Pomodoros: <span className="text-[#FF3C00] font-bold">{completedPomodoros}</span>
          {completedPomodoros > 0 && (
            <span className="text-gray-500 ml-2">
              (Next long break after {pomodorosUntilLongBreak - (completedPomodoros % pomodorosUntilLongBreak)} more)
            </span>
          )}
        </div>
      </div>

      {/* Settings and Controls */}
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-4 py-2 rounded-br-lg text-sm font-bold transition-colors duration-200 bg-gray-700 text-[#D1D1D1] hover:bg-gray-600"
        >
          ⚙️ Settings
        </button>
        <button
          onClick={requestNotificationPermission}
          className={`px-4 py-2 rounded-br-lg text-sm font-bold transition-colors duration-200
                      ${notificationsEnabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-[#D1D1D1] hover:bg-gray-600'}`}
        >
          {notificationsEnabled ? '🔔 Notifications On' : '🔕 Enable Notifications'}
        </button>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`px-4 py-2 rounded-br-lg text-sm font-bold transition-colors duration-200
                      ${soundEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700 text-[#D1D1D1] hover:bg-gray-600'}`}
        >
          {soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="mb-6">
          <h3 className="text-xl font-bold text-[#FF3C00] mb-4">Timer Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#D1D1D1] mb-2 font-semibold">Short Break Duration (minutes)</label>
              <input
                type="number"
                value={shortBreakDuration}
                onChange={(e) => setShortBreakDuration(parseInt(e.target.value) || 5)}
                min="1"
                max="30"
                className="w-full p-2 bg-[#0F0F0F] border border-[#333] rounded-lg text-[#D1D1D1]"
              />
            </div>
            <div>
              <label className="block text-[#D1D1D1] mb-2 font-semibold">Long Break Duration (minutes)</label>
              <input
                type="number"
                value={longBreakDuration}
                onChange={(e) => setLongBreakDuration(parseInt(e.target.value) || 15)}
                min="5"
                max="60"
                className="w-full p-2 bg-[#0F0F0F] border border-[#333] rounded-lg text-[#D1D1D1]"
              />
            </div>
            <div>
              <label className="block text-[#D1D1D1] mb-2 font-semibold">Pomodoros until Long Break</label>
              <input
                type="number"
                value={pomodorosUntilLongBreak}
                onChange={(e) => setPomodorosUntilLongBreak(parseInt(e.target.value) || 4)}
                min="2"
                max="10"
                className="w-full p-2 bg-[#0F0F0F] border border-[#333] rounded-lg text-[#D1D1D1]"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Task Management */}
      <h3 className="text-2xl text-[#FF3C00] font-bold mb-4 uppercase">Tasks</h3>
      <div className="flex flex-col sm:flex-row mb-4">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task..."
          className="flex-grow bg-[#0F0F0F] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-xl focus:outline-none focus:border-[#FF3C00] mb-2 sm:mb-0"
        />
        <NeonButton onClick={addTask} className="sm:ml-2">Add</NeonButton>
      </div>

      <div className="mb-2">
        <p className="text-xs text-gray-500 text-center">💡 Swipe right to complete, left to delete</p>
      </div>
      <ul className="flex-grow overflow-y-auto pr-2">
        {tasks.length === 0 && <p className="text-center text-[#D1D1D1] opacity-70">No tasks yet. Add one to get started!</p>}
        {tasks.map((task) => (
          <SwipeableItem
            key={task.id}
            onSwipeLeft={() => deleteTask(task.id)}
            onSwipeRight={() => toggleTaskCompletion(task.id, task.completed)}
            leftAction="Delete"
            rightAction={task.completed ? "Undo" : "Complete"}
            leftColor="bg-red-500"
            rightColor={task.completed ? "bg-yellow-500" : "bg-green-500"}
            className="mb-2"
          >
            <li className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0F0F0F] p-3 rounded-br-lg border border-[#222] hover:bg-[#151515] transition-colors duration-200">
              {editingTaskId === task.id ? (
                <input
                  type="text"
                  value={editingTaskText}
                  onChange={(e) => setEditingTaskText(e.target.value)}
                  onBlur={() => saveEditedTask(task.id)} // Save on blur
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') saveEditedTask(task.id);
                    if (e.key === 'Escape') cancelEditingTask();
                  }}
                  className="flex-grow bg-transparent border-b border-[#FF3C00] text-[#D1D1D1] focus:outline-none p-1 w-full sm:w-auto"
                  autoFocus
                />
              ) : (
                <span
                  className={`flex-grow text-lg ${task.completed ? 'line-through text-gray-500' : 'text-[#D1D1D1]'} w-full sm:w-auto mb-2 sm:mb-0`}
                  onDoubleClick={() => startEditingTask(task)}
                >
                  {task.text}
                </span>
              )}
              <div className="flex items-center space-x-2 sm:ml-4 self-end sm:self-auto">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTaskCompletion(task.id, task.completed)}
                  className="form-checkbox h-5 w-5 text-[#FF3C00] bg-black border-gray-600 rounded focus:ring-[#FF3C00]"
                />
                {editingTaskId !== task.id && (
                  <>
                    <button
                      onClick={() => startEditingTask(task)}
                      className="text-gray-400 hover:text-[#FF3C00] transition-colors duration-200 p-1"
                      title="Edit Task"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.829z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1"
                      title="Delete Task"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </li>
          </SwipeableItem>
        ))}
      </ul>
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalContent.title}
        message={modalContent.message}
      />
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={modalContent.title}
        message={modalContent.message}
        onConfirm={modalConfirmAction}
        showConfirm={true}
      />
      
      {/* Focus Score Modal */}
      {showFocusScore && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full text-center">
            <h3 className="text-xl text-[#FF3C00] font-bold mb-4">Rate Your Focus</h3>
            <p className="text-[#D1D1D1] mb-6">How focused were you during this Pomodoro session?</p>
            
            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map(score => (
                <button
                  key={score}
                  onClick={() => setFocusScore(score)}
                  className={`w-12 h-12 rounded-full text-lg font-bold transition-all duration-200
                              ${focusScore === score 
                                ? 'bg-[#FF3C00] text-white' 
                                : 'bg-gray-700 text-[#D1D1D1] hover:bg-gray-600'}`}
                >
                  {score}
                </button>
              ))}
            </div>
            
            <div className="text-sm text-gray-500 mb-6">
              {focusScore === 1 && 'Very Distracted'}
              {focusScore === 2 && 'Somewhat Distracted'}
              {focusScore === 3 && 'Moderate Focus'}
              {focusScore === 4 && 'Good Focus'}
              {focusScore === 5 && 'Excellent Focus'}
            </div>
            
            <div className="flex justify-center space-x-4">
              <NeonButton onClick={saveFocusScore}>
                Save Score
              </NeonButton>
            </div>
          </Card>
        </div>
      )}
      {/* Add Task Form */}
      {(showAddTaskForm || window.innerWidth >= 768) && (
        <Card className="mb-8 p-4 bg-[#0F0F0F] border border-[#222]">
          <h4 className="text-xl text-[#FF3C00] font-bold mb-4">Add New Task</h4>
          <div className="space-y-4">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Enter task description..."
              className="w-full bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-md focus:outline-none focus:border-[#FF3C00]"
            />
            <NeonButton onClick={addTask} className="w-full">Add Task</NeonButton>
            {window.innerWidth < 768 && (
              <button onClick={() => setShowAddTaskForm(false)} className="mt-2 text-gray-400 hover:text-red-500">Cancel</button>
            )}
          </div>
        </Card>
      )}
      {/* FAB for Add Task (mobile only) */}
      {window.innerWidth < 768 && (
        <FAB onClick={() => setShowAddTaskForm(true)} label="Add Task" icon="+" />
      )}
    </Card>
  );
};

// --- Binaural Beats Generator Component ---
const BinauralBeats = () => {
  const [baseFrequency, setBaseFrequency] = useState(220); // Hz
  const [beatFrequency, setBeatFrequency] = useState(10); // Hz (e.g., Alpha wave)
  const [isPlaying, setIsPlaying] = useState(false);
  const [oscillatorL, setOscillatorL] = useState(null);
  const [oscillatorR, setOscillatorR] = useState(null);
  const [gainNode, setGainNode] = useState(null);
  const [bgAudio, setBgAudio] = useState(null);
  const [bgGainNode, setBgGainNode] = useState(null);
  const [bgType, setBgType] = useState('none');
  const [bgVolume, setBgVolume] = useState(0.2);
  const [volume, setVolume] = useState(0.3);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const [isFading, setIsFading] = useState(false);

  const presets = [
    { name: 'Delta (0.5-4 Hz)', beat: 2, description: 'Deep sleep, relaxation' },
    { name: 'Theta (4-8 Hz)', beat: 6, description: 'Meditation, creativity, REM sleep' },
    { name: 'Alpha (8-12 Hz)', beat: 10, description: 'Relaxed focus, light meditation' },
    { name: 'Beta (12-30 Hz)', beat: 20, description: 'Alertness, concentration, active thinking' },
    { name: 'Gamma (30-100 Hz)', beat: 40, description: 'Problem-solving, high-level processing' },
  ];

  const bgOptions = [
    { value: 'none', label: 'None' },
    { value: 'nature', label: 'Nature (Rain)' },
    { value: 'white', label: 'White Noise' },
    { value: 'pink', label: 'Pink Noise' },
    { value: 'brown', label: 'Brown Noise' },
  ];

  useEffect(() => {
    // Clean up oscillators and audio on unmount
    return () => {
      stopBeats();
    };
    // eslint-disable-next-line
  }, []);

  // Helper: Resume audio context on user gesture
  const resumeAudioContext = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
    }
  };

  // Helper: Fade volume
  const fadeVolume = (node, from, to, duration = 1) => {
    if (!node) return;
    node.gain.cancelScheduledValues(Tone.now());
    node.gain.setValueAtTime(from, Tone.now());
    node.gain.linearRampToValueAtTime(to, Tone.now() + duration);
  };

  // Helper: Create background sound
  const createBgSound = (type) => {
    let player, gain;
    gain = new Tone.Gain(bgVolume).toDestination();
    if (type === 'nature') {
      // Use a short rain loop (royalty-free, public domain)
      player = new Tone.Player({
        url: 'https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae5b2.mp3', // Rain loop
        loop: true,
        autostart: true,
      }).connect(gain);
    } else if (type === 'white' || type === 'pink' || type === 'brown') {
      let noise;
      if (type === 'white') noise = new Tone.Noise('white');
      if (type === 'pink') noise = new Tone.Noise('pink');
      if (type === 'brown') noise = new Tone.Noise('brown');
      noise.connect(gain);
      noise.start();
      player = noise;
    }
    return { player, gain };
  };

  const startBeats = async () => {
    setIsFading(true);
    try {
      await resumeAudioContext();
      if (oscillatorL) oscillatorL.dispose();
      if (oscillatorR) oscillatorR.dispose();
      if (gainNode) gainNode.dispose();
      if (bgAudio) bgAudio.dispose();
      if (bgGainNode) bgGainNode.dispose();

      // Main binaural beats
      const gain = new Tone.Gain(0).toDestination();
      const oL = new Tone.Oscillator(baseFrequency, 'sine').connect(gain);
      const oR = new Tone.Oscillator(baseFrequency + beatFrequency, 'sine').connect(gain);
      oL.volume.value = -10;
      oR.volume.value = -10;
      oL.start();
      oR.start();
      setOscillatorL(oL);
      setOscillatorR(oR);
      setGainNode(gain);
      // Fade in
      fadeVolume(gain, 0, volume, 1.5);

      // Background sound
      let bg = null, bgGain = null;
      if (bgType !== 'none') {
        const { player, gain: g } = createBgSound(bgType);
        bg = player;
        bgGain = g;
        fadeVolume(bgGain, 0, bgVolume, 2);
        setBgAudio(bg);
        setBgGainNode(bgGain);
      }
      setIsPlaying(true);
      setTimeout(() => setIsFading(false), 1600);
    } catch (error) {
      setIsFading(false);
      console.error('Error starting binaural beats:', error);
      setModalContent({ title: 'Audio Error', message: 'Failed to start audio. Please ensure your browser allows audio playback and try again.' });
      setShowModal(true);
    }
  };

  const stopBeats = () => {
    setIsFading(true);
    if (gainNode) fadeVolume(gainNode, volume, 0, 1.2);
    if (bgGainNode) fadeVolume(bgGainNode, bgVolume, 0, 1.2);
    setTimeout(() => {
      if (oscillatorL) oscillatorL.dispose();
      if (oscillatorR) oscillatorR.dispose();
      if (gainNode) gainNode.dispose();
      if (bgAudio) bgAudio.dispose();
      if (bgGainNode) bgGainNode.dispose();
      setOscillatorL(null);
      setOscillatorR(null);
      setGainNode(null);
      setBgAudio(null);
      setBgGainNode(null);
      setIsPlaying(false);
      setIsFading(false);
    }, 1300);
  };

  const setPreset = (beat) => {
    setBeatFrequency(beat);
    if (isPlaying) {
      stopBeats();
      setTimeout(() => startBeats(), 1400);
    }
  };

  // Update frequencies if playing
  useEffect(() => {
    if (isPlaying && oscillatorL && oscillatorR) {
      oscillatorL.frequency.value = baseFrequency;
      oscillatorR.frequency.value = baseFrequency + beatFrequency;
    }
    // eslint-disable-next-line
  }, [baseFrequency, beatFrequency, isPlaying, oscillatorL, oscillatorR]);

  // Update volumes if changed
  useEffect(() => {
    if (gainNode) gainNode.gain.value = volume;
  }, [volume, gainNode]);
  useEffect(() => {
    if (bgGainNode) bgGainNode.gain.value = bgVolume;
  }, [bgVolume, bgGainNode]);

  return (
    <Card className="w-full h-full flex flex-col p-4 md:p-6">
      <h2 className="text-3xl text-[#FF3C00] font-bold mb-6 uppercase">Binaural Beats</h2>

      <p className="text-[#D1D1D1] mb-6 text-sm leading-relaxed">
        Binaural beats are an auditory illusion perceived when two different pure-tone sine waves,
        both with frequencies lower than 1000 Hz, with a difference between them of less than 30 Hz,
        are presented to a listener dichotically (one tone to each ear).
        The brain integrates the two signals, creating the perception of a third "beat" frequency.
      </p>

      {/* Controls */}
      <div className="mb-8 space-y-4">
        <div>
          <label htmlFor="baseFreq" className="block text-[#FF3C00] text-lg mb-2">Base Frequency: {baseFrequency} Hz</label>
          <input
            id="baseFreq"
            type="range"
            min="100"
            max="600"
            value={baseFrequency}
            onChange={e => setBaseFrequency(Number(e.target.value))}
            className="w-full accent-[#FF3C00]"
            disabled={isPlaying && isFading}
          />
        </div>
        <div>
          <label htmlFor="beatFreq" className="block text-[#FF3C00] text-lg mb-2">Beat Frequency: {beatFrequency} Hz</label>
          <input
            id="beatFreq"
            type="range"
            min="1"
            max="40"
            value={beatFrequency}
            onChange={e => setBeatFrequency(Number(e.target.value))}
            className="w-full accent-[#FF3C00]"
            disabled={isPlaying && isFading}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {presets.map(preset => (
            <button
              key={preset.name}
              onClick={() => setPreset(preset.beat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors duration-200
                ${beatFrequency === preset.beat ? 'bg-[#FF3C00] text-white' : 'bg-gray-700 text-[#D1D1D1] hover:bg-gray-600'}`}
              disabled={isPlaying && isFading}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="flex-1">
            <label className="block text-[#FF3C00] text-lg mb-2">Binaural Volume</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="w-full accent-[#FF3C00]"
              disabled={!isPlaying}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[#FF3C00] text-lg mb-2">Background Sound</label>
            <select
              value={bgType}
              onChange={e => setBgType(e.target.value)}
              className="w-full p-2 rounded-lg bg-[#1a1a1a] text-[#D1D1D1] border border-[#333]"
              disabled={isPlaying}
            >
              {bgOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {bgType !== 'none' && (
              <div className="mt-2">
                <label className="block text-[#FF3C00] text-lg mb-2">Background Volume</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={bgVolume}
                  onChange={e => setBgVolume(Number(e.target.value))}
                  className="w-full accent-[#FF3C00]"
                  disabled={!isPlaying}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4 mt-6">
          {!isPlaying ? (
            <NeonButton onClick={startBeats} disabled={isFading}>
              ▶️ Start
            </NeonButton>
          ) : (
            <NeonButton onClick={stopBeats} disabled={isFading}>
              ⏹️ Stop
            </NeonButton>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalContent.title}
        message={modalContent.message}
      />
    </Card>
  );
};

// --- Focus Guides Component ---
const FocusGuides = () => {
  const guides = [
    {
      title: "The Pomodoro Technique",
      description: "Learn how to use 25-minute work intervals and short breaks to boost productivity.",
      content: "The Pomodoro Technique is a time management method developed by Francesco Cirillo in the late 1980s. The technique uses a timer to break down work into intervals, traditionally 25 minutes in length, separated by short breaks. Each interval is known as a pomodoro, from the Italian word for 'tomato', after the tomato-shaped kitchen timer Cirillo used as a university student.\n\n**Steps:**\n1. Choose a task to be accomplished.\n2. Set the Pomodoro timer (traditionally for 25 minutes).\n3. Work on the task until the timer rings. If a distraction pops into your head, write it down on a piece of paper and immediately get back to the task.\n4. When the timer rings, put a checkmark on a piece of paper.\n5. If you have fewer than four checkmarks, take a short break (3–5 minutes), then go to step 1.\n6. After four pomodoros, take a longer break (15–30 minutes), reset your checkmark count to zero, and then go to step 1."
    },
    {
      title: "Mindfulness for Focus",
      description: "Discover mindfulness exercises to improve concentration and reduce distractions.",
      content: "Mindfulness is the practice of being present and fully engaged in the current moment, without judgment. It can significantly enhance your ability to focus by training your attention and reducing mental clutter.\n\n**Exercises:**\n* **Mindful Breathing:** Sit comfortably, close your eyes, and bring your attention to your breath. Notice the sensation of each inhale and exhale. When your mind wanders, gently bring it back to your breath.\n* **Body Scan:** Lie down and bring attention to different parts of your body, noticing any sensations without trying to change them. This helps you become more aware of your physical presence.\n* **Mindful Walking:** Pay attention to the sensations of walking – the feeling of your feet on the ground, the movement of your legs, the rhythm of your steps. Engage all your senses.\n\nPracticing mindfulness regularly can help you develop a stronger 'attention muscle,' making it easier to stay focused on tasks and less susceptible to distractions."
    },
    {
      title: "Optimizing Your Workspace",
      description: "Tips for creating an environment conducive to deep work and minimal interruptions.",
      content: "Your physical workspace plays a crucial role in your ability to focus. A well-organized and distraction-free environment can significantly boost your productivity.\n\n**Tips for an Optimized Workspace:**\n* **Declutter:** Remove anything from your desk that isn't directly related to your current task. A cluttered space leads to a cluttered mind.\n* **Minimize Visual Distractions:** Position your desk facing a wall or a calm view if possible. Avoid placing distracting items (e.g., personal photos, excessive decor) in your direct line of sight.\n* **Ergonomics:** Ensure your chair, desk, and monitor are set up ergonomically to prevent discomfort and fatigue, which can break your concentration.\n* **Lighting:** Use natural light whenever possible. If not, opt for cool-toned LED lighting that mimics daylight to maintain alertness.\n* **Sound Management:** Use noise-canceling headphones if you work in a noisy environment. Consider ambient sounds or instrumental music if it helps you focus.\n* **Separate Work and Leisure:** If possible, have a dedicated workspace that you associate only with work. This helps your brain switch into 'work mode' more easily."
    },
    {
      title: "Digital Detox Strategies",
      description: "Strategies to reduce digital distractions and reclaim your attention.",
      content: "In today's digital age, distractions are constantly vying for our attention. Implementing digital detox strategies can help you reclaim your focus and improve your productivity.\n\n**Strategies:**\n* **Notification Management:** Turn off all non-essential notifications on your phone, computer, and other devices. Only allow critical alerts.\n* **Scheduled Screen Time:** Designate specific times for checking emails, social media, and news. Avoid constantly checking these throughout the day.\n* **App Limits:** Use app-limiting features on your smartphone to restrict time spent on distracting applications.\n* **No-Phone Zones:** Establish areas or times (e.g., dinner, bedtime) where phones are not allowed.\n* **Batching Tasks:** Group similar digital tasks (e.g., responding to emails, processing notifications) and handle them all at once during a dedicated time block.\n* **Use Focus Apps:** Utilize apps designed to block distracting websites or applications during your work sessions.\n\nBy consciously managing your digital interactions, you can create more space for deep, focused work."
    }
  ];

  const [selectedGuide, setSelectedGuide] = useState(null);

  return (
    <Card className="w-full h-full flex flex-col p-4 md:p-6">
      <h2 className="text-3xl text-[#FF3C00] font-bold mb-6 uppercase">Focus Guides</h2>

      {selectedGuide ? (
        <div className="flex flex-col h-full">
          <h3 className="text-2xl text-[#FF3C00] font-bold mb-4 uppercase">{selectedGuide.title}</h3>
          <p className="text-[#D1D1D1] whitespace-pre-wrap leading-relaxed flex-grow overflow-y-auto pr-2">
            {selectedGuide.content}
          </p>
          <NeonButton onClick={() => setSelectedGuide(null)} className="mt-6 self-start">
            Back to Guides
          </NeonButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow overflow-y-auto pr-2">
          {guides.map((guide, index) => (
            <Card key={index} className="p-4 bg-[#0F0F0F] border border-[#222] hover:border-[#FF3C00] transition-all duration-200 cursor-pointer">
              <button onClick={() => setSelectedGuide(guide)} className="w-full text-left focus:outline-none">
                <h3 className="text-xl text-[#FF3C00] font-bold mb-2">{guide.title}</h3>
                <p className="text-sm text-[#D1D1D1]">{guide.description}</p>
              </button>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};

// --- Nootropics Component ---
const Nootropics = () => {
  const stacks = [
    {
      title: "More Energy & Physical Performance",
      description: "Enhance your stamina, reduce fatigue, and boost overall physical output.",
      nootropics: [
        "Creatine Monohydrate",
        "L-Carnitine",
        "Rhodiola Rosea",
        "Coenzyme Q10 (CoQ10)",
        "Cordyceps"
      ]
    },
    {
      title: "More Cognitive Performance & Focus",
      description: "Improve memory, concentration, mental clarity, and learning capabilities.",
      nootropics: [
        "Bacopa Monnieri",
        "Lion's Mane Mushroom",
        "L-Theanine (with Caffeine)",
        "Ginkgo Biloba",
        "Alpha-GPC"
      ]
    },
    {
      title: "Overall Hormonal Maximization (Males)",
      description: "Support healthy hormone levels for vitality, mood, and physical well-being.",
      nootropics: [
        "Ashwagandha",
        "Tongkat Ali",
        "Fenugreek",
        "Vitamin D3",
        "Zinc"
      ]
    }
  ];

  return (
    <Card className="w-full h-full flex flex-col p-4 md:p-6">
      <h2 className="text-3xl text-[#FF3C00] font-bold mb-6 uppercase">Nootropics Stacks</h2>
      <p className="text-[#D1D1D1] mb-6 text-sm leading-relaxed">
        Explore curated nootropic stacks designed to target specific areas of performance and well-being.
        Always consult with a healthcare professional before starting any new supplement regimen.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow overflow-y-auto pr-2">
        {stacks.map((stack, index) => (
          <Card key={index} className="p-4 bg-[#0F0F0F] border border-[#222]">
            <h3 className="text-xl text-[#FF3C00] font-bold mb-2">{stack.title}</h3>
            <p className="text-sm text-[#D1D1D1] mb-4">{stack.description}</p>
            <ul className="list-disc list-inside text-[#D1D1D1] text-sm space-y-1">
              {stack.nootropics.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Card>
  );
};

// --- Braverman Test Component ---
const BravermanTest = ({ onRetake }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);

  const questions = [
    // Dopamine Questions
    {
      id: 'd1',
      neurotransmitter: 'Dopamine',
      question: "Do you often feel driven and highly motivated?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 'd2',
      neurotransmitter: 'Dopamine',
      question: "Are you a risk-taker or thrill-seeker?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 'd3',
      neurotransmitter: 'Dopamine',
      question: "Do you tend to be highly competitive?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 'd4',
      neurotransmitter: 'Dopamine',
      question: "Do you have a strong desire for recognition or achievement?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    // Acetylcholine Questions
    {
      id: 'a1',
      neurotransmitter: 'Acetylcholine',
      question: "Do you have an excellent memory for details?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 'a2',
      neurotransmitter: 'Acetylcholine',
      question: "Are you creative and artistic?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 'a3',
      neurotransmitter: 'Acetylcholine',
      question: "Do you enjoy learning new things and intellectual pursuits?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 'a4',
      neurotransmitter: 'Acetylcholine',
      question: "Are you a good storyteller or communicator?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    // GABA Questions
    {
      id: 'g1',
      neurotransmitter: 'GABA',
      question: "Do you generally feel calm and relaxed?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 'g2',
      neurotransmitter: 'GABA',
      question: "Are you good at handling stress and pressure?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 'g3',
      neurotransmitter: 'GABA',
      question: "Do you prefer routine and predictability?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 'g4',
      neurotransmitter: 'GABA',
      question: "Do you sleep soundly and wake up refreshed?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    // Serotonin Questions
    {
      id: 's1',
      neurotransmitter: 'Serotonin',
      question: "Do you have a generally positive and optimistic outlook?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 's2',
      neurotransmitter: 'Serotonin',
      question: "Are you a good team player and enjoy social interactions?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 's3',
      neurotransmitter: 'Serotonin',
      question: "Do you feel satisfied and content with your life?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
    {
      id: 's4',
      neurotransmitter: 'Serotonin',
      question: "Do you cope well with change and adapt easily?",
      options: [
        { text: "Never", value: 0 },
        { text: "Sometimes", value: 1 },
        { text: "Often", value: 2 },
        { text: "Always", value: 3 }
      ]
    },
  ];

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      calculateResults();
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateResults = () => {
    const scores = {
      Dopamine: 0,
      Acetylcholine: 0,
      GABA: 0,
      Serotonin: 0,
    };

    questions.forEach(q => {
      if (answers[q.id] !== undefined) {
        scores[q.neurotransmitter] += answers[q.id];
      }
    });

    const dominantNeurotransmitter = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    setResults({ scores, dominantNeurotransmitter });
  };

  const getRecommendations = (neurotransmitter) => {
    switch (neurotransmitter) {
      case 'Dopamine':
        return {
          title: "Dopamine Dominant Profile",
          description: "You likely thrive on challenge, achievement, and novelty. You are driven, energetic, and enjoy being in charge. When out of balance, you might experience impulsivity, restlessness, or difficulty relaxing.",
          diet: "Include tyrosine-rich foods (lean meats, eggs, dairy, nuts, seeds), avoid excessive sugar and processed foods. Stay hydrated.",
          lifestyle: "Set achievable goals, engage in regular physical activity, pursue new hobbies, get sufficient sleep, practice mindfulness to manage impulsivity.",
          nootropics: "L-Tyrosine, Rhodiola Rosea, Creatine, Panax Ginseng."
        };
      case 'Acetylcholine':
        return {
          title: "Acetylcholine Dominant Profile",
          description: "You are likely creative, intuitive, and possess an excellent memory. You enjoy learning and intellectual pursuits. When out of balance, you might feel overwhelmed, indecisive, or have memory lapses.",
          diet: "Include choline-rich foods (eggs, liver, fish, soybeans), healthy fats (avocado, olive oil), and antioxidants (berries, dark leafy greens).",
          lifestyle: "Engage in creative activities, practice memory exercises, ensure adequate rest, manage stress through relaxation techniques like meditation.",
          nootropics: "Alpha-GPC, Citicoline, Huperzine A, Bacopa Monnieri, Lion's Mane."
        };
      case 'GABA':
        return {
          title: "GABA Dominant Profile",
          description: "You are likely calm, stable, and resilient to stress. You prefer routine and enjoy social harmony. When out of balance, you might experience anxiety, irritability, or difficulty relaxing.",
          diet: "Focus on complex carbohydrates (whole grains, vegetables), fermented foods, and magnesium-rich foods (leafy greens, nuts). Limit caffeine and alcohol.",
          lifestyle: "Practice relaxation techniques (yoga, deep breathing), maintain a consistent sleep schedule, engage in gentle exercise, spend time in nature.",
          nootropics: "L-Theanine, Magnesium, Valerian Root, Ashwagandha."
        };
      case 'Serotonin':
        return {
          title: "Serotonin Dominant Profile",
          description: "You are likely optimistic, socially adept, and empathetic. You find joy in connection and routine. When out of balance, you might experience low mood, obsessive thoughts, or sleep disturbances.",
          diet: "Consume tryptophan-rich foods (turkey, chicken, nuts, seeds, cheese), complex carbohydrates, and omega-3 fatty acids (fatty fish).",
          lifestyle: "Prioritize social connections, engage in activities that bring joy, get regular sunlight exposure, maintain a consistent sleep-wake cycle, practice gratitude.",
          nootropics: "5-HTP (use with caution and professional guidance), St. John's Wort (interacts with medications), Saffron, Tryptophan."
        };
      default:
        return {
          title: "Neurotransmitter Profile",
          description: "Take the test to discover your dominant neurotransmitter and receive personalized recommendations!",
          diet: "", lifestyle: "", nootropics: ""
        };
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const recommendation = results ? getRecommendations(results.dominantNeurotransmitter) : null;

  return (
    <Card className="w-full h-full flex flex-col p-4 md:p-6">
      <h2 className="text-3xl text-[#FF3C00] font-bold mb-6 uppercase">Braverman Test</h2>
      <p className="text-[#D1D1D1] mb-6 text-sm leading-relaxed">
        Answer the questions below to get an insight into your dominant neurochemical profile and receive personalized recommendations.
      </p>

      {!results ? (
        <div className="flex flex-col flex-grow">
          <h3 className="text-xl text-[#FF3C00] font-bold mb-4">
            Question {currentQuestionIndex + 1} of {questions.length}
          </h3>
          <p className="text-lg text-[#D1D1D1] mb-6 flex-grow">{currentQuestion.question}</p>
          <div className="space-y-4 mb-6">
            {currentQuestion.options.map(option => (
              <label key={option.text} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={option.value}
                  checked={answers[currentQuestion.id] === option.value}
                  onChange={() => handleAnswer(currentQuestion.id, option.value)}
                  className="form-radio h-5 w-5 text-[#FF3C00] bg-black border-gray-600 focus:ring-[#FF3C00]"
                />
                <span className="text-lg text-[#D1D1D1]">{option.text}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between mt-auto">
            <NeonButton
              onClick={goToPreviousQuestion}
              className={`${currentQuestionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </NeonButton>
            <NeonButton
              onClick={goToNextQuestion}
              disabled={answers[currentQuestion.id] === undefined}
            >
              {currentQuestionIndex === questions.length - 1 ? 'Get Results' : 'Next'}
            </NeonButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-grow overflow-y-auto pr-2">
          <h3 className="text-2xl text-[#FF3C00] font-bold mb-4 uppercase">Your Results</h3>
          <p className="text-xl text-[#D1D1D1] mb-6">
            Your dominant neurochemical profile appears to be: <span className="text-[#FF3C00] font-bold">{results.dominantNeurotransmitter}</span>
          </p>

          <Card className="p-4 bg-[#0F0F0F] border border-[#222] mb-6">
            <h4 className="text-xl text-[#FF3C00] font-bold mb-2">{recommendation.title}</h4>
            <p className="text-sm text-[#D1D1D1] mb-4">{recommendation.description}</p>

            <h5 className="text-lg text-[#FF3C00] font-bold mb-1">Dietary Recommendations:</h5>
            <p className="text-sm text-[#D1D1D1] mb-3">{recommendation.diet}</p>

            <h5 className="text-lg text-[#FF3C00] font-bold mb-1">Lifestyle Recommendations:</h5>
            <p className="text-sm text-[#D1D1D1] mb-3">{recommendation.lifestyle}</p>

            <h5 className="text-lg text-[#FF3C00] font-bold mb-1">Suggested Nootropics:</h5>
            <p className="text-sm text-[#D1D1D1]">{recommendation.nootropics}</p>
          </Card>

          <div className="mt-auto">
            <NeonButton onClick={() => { setResults(null); setCurrentQuestionIndex(0); setAnswers({}); onRetake(); }}>
              Retake Test
            </NeonButton>
          </div>
        </div>
      )}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalContent.title}
        message={modalContent.message}
      />
      {/* --- New Informational Section --- */}
      <div className="mt-10 p-6 bg-[#181818] border border-[#333] rounded-xl shadow-lg">
        <h3 className="text-2xl font-bold text-[#FF3C00] mb-4">About the Braverman Test</h3>
        <p className="text-[#D1D1D1] mb-2">
          The <b>Braverman Test</b> is a self-assessment developed by Dr. Eric Braverman to help you discover which of your four main brain neurotransmitters is most dominant (and which may be deficient): <b>Dopamine</b>, <b>Acetylcholine</b>, <b>GABA</b>, and <b>Serotonin</b>.
        </p>
        <p className="text-[#D1D1D1] mb-2">
          Each neurotransmitter is linked to specific personality traits, cognitive strengths, and even physical tendencies. The test helps you understand your unique "brain chemistry profile."
        </p>
        <ul className="list-disc pl-6 mb-2 text-[#D1D1D1]">
          <li><b>Dopamine-dominant:</b> Driven, energetic, achievement-oriented, sometimes restless or impulsive.</li>
          <li><b>Acetylcholine-dominant:</b> Creative, intuitive, excellent memory, emotionally expressive.</li>
          <li><b>GABA-dominant:</b> Calm, stable, organized, loyal, prefers routine.</li>
          <li><b>Serotonin-dominant:</b> Optimistic, social, empathetic, lives in the moment.</li>
        </ul>
        <h4 className="text-xl font-bold text-[#FF3C00] mt-4 mb-2">Why is the Braverman Test Important?</h4>
        <ul className="list-disc pl-6 mb-2 text-[#D1D1D1]">
          <li>Identify your natural strengths and weaknesses (e.g., focus, creativity, resilience, sociability).</li>
          <li>Recognize why you may struggle with certain habits, moods, or stressors.</li>
          <li>Personalize your approach to productivity, relationships, and self-care.</li>
          <li>Find targeted strategies (diet, exercise, supplements, lifestyle changes) to support your brain chemistry and overall well-being.</li>
        </ul>
        <h4 className="text-xl font-bold text-[#FF3C00] mt-4 mb-2">How Can Understanding Your Results Change Your Life?</h4>
        <ul className="list-disc pl-6 mb-2 text-[#D1D1D1]">
          <li><b>Self-awareness:</b> Better understand your natural tendencies, motivations, and challenges.</li>
          <li><b>Personal growth:</b> Work on your weaker areas and leverage your strengths.</li>
          <li><b>Tailored lifestyle:</b> Adjust your habits, nutrition, and routines to support your unique brain chemistry.</li>
          <li><b>Improved relationships:</b> Communicate and connect more effectively by understanding your profile (and others').</li>
          <li><b>Better mental health:</b> Use targeted strategies to manage stress, anxiety, or low mood.</li>
        </ul>
        <h4 className="text-xl font-bold text-[#FF3C00] mt-4 mb-2">Example: How Results Can Be Used</h4>
        <ul className="list-disc pl-6 mb-2 text-[#D1D1D1]">
          <li>If you're <b>dopamine-dominant</b> but feel restless or unfocused, you might benefit from structured goals, regular exercise, and mindfulness.</li>
          <li>If you're <b>GABA-deficient</b> and feel anxious, you might focus on relaxation techniques, sleep hygiene, and magnesium-rich foods.</li>
          <li>If you're <b>serotonin-dominant</b> but struggle with low mood, you might benefit from social connection, gratitude practices, and sunlight exposure.</li>
        </ul>
        <p className="text-[#D1D1D1] mt-4">
          <b>The Braverman Test is a powerful tool for self-discovery and personal optimization.</b> By understanding your brain's unique chemistry, you can make smarter choices for your health, productivity, and happiness.
        </p>
      </div>
    </Card>
  );
};

// --- Flashcards Component ---
const Flashcards = ({ userId, db }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });

  const flashcardsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/flashcards`);

  useEffect(() => {
    if (!userId) return;

    // Fetch cards due for review today or never reviewed
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const q = query(
      flashcardsCollectionRef
      // No orderBy here to avoid index issues, sort in client
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Ensure nextReviewDate is a Date object for comparison
        nextReviewDate: doc.data().nextReviewDate ? new Date(doc.data().nextReviewDate) : new Date(0) // Use epoch for never reviewed
      }));

      // Filter cards due for review today
      const cardsDue = fetchedCards.filter(card => {
        return card.nextReviewDate <= today;
      });

      // Sort cards by nextReviewDate (earliest first) for review order
      cardsDue.sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());

      setFlashcards(cardsDue);
      setCurrentCardIndex(0); // Reset to first card in the review queue
      setShowAnswer(false);
    }, (error) => {
      console.error("Error fetching flashcards:", error);
      setModalContent({ title: 'Error', message: 'Failed to load flashcards. Please try again.' });
      setShowModal(true);
    });

    return () => unsubscribe();
  }, [userId, db]);

  const addFlashcard = async () => {
    if (newQuestion.trim() === '' || newAnswer.trim() === '') {
      setModalContent({ title: 'Input Error', message: 'Question and Answer cannot be empty.' });
      setShowModal(true);
      return;
    }
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize for initial review date
      await addDoc(flashcardsCollectionRef, {
        question: newQuestion,
        answer: newAnswer,
        lastReviewDate: null, // No last review date initially
        nextReviewDate: today.toISOString(), // Due immediately
        interval: 0, // Initial interval
        eFactor: 2.5, // Initial ease factor
      });
      setNewQuestion('');
      setNewAnswer('');
      setShowAddCardForm(false);
    } catch (e) {
      console.error("Error adding flashcard: ", e);
      setModalContent({ title: 'Error', message: 'Failed to add flashcard. Please try again.' });
      setShowModal(true);
    }
  };

  const calculateNextReview = (card, quality) => {
    let newEFactor = card.eFactor || 2.5;
    let newInterval = card.interval || 0;

    if (quality >= 3) { // Correct answer (Good, Easy)
      if (quality === 3) { // Correct, but with difficulty (Good)
        // E-Factor remains the same for 'Good' in simplified SM-2
      } else { // Correct, good or easy (Easy)
        newEFactor = newEFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      }
      if (newEFactor < 1.3) newEFactor = 1.3; // Minimum E-Factor

      if (newInterval === 0) { // First correct answer
        newInterval = 1;
      } else if (newInterval === 1) { // Second correct answer
        newInterval = 6;
      } else {
        newInterval = Math.round(newInterval * newEFactor);
      }
    } else { // Incorrect answer (Again, Hard)
      newInterval = 0; // Reset interval to 0 (review again soon)
      newEFactor = newEFactor - 0.2; // Decrease E-Factor
      if (newEFactor < 1.3) newEFactor = 1.3; // Minimum E-Factor
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      nextReviewDate: nextReviewDate.toISOString(),
      interval: newInterval,
      eFactor: newEFactor,
    };
  };

  const handleReview = async (quality) => {
    const card = flashcards[currentCardIndex];
    if (!card) return;

    const { nextReviewDate, interval, eFactor } = calculateNextReview(card, quality);

    try {
      const cardDocRef = doc(db, `artifacts/${appId}/users/${userId}/flashcards`, card.id);
      await updateDoc(cardDocRef, {
        lastReviewDate: new Date().toISOString(),
        nextReviewDate: nextReviewDate,
        interval: interval,
        eFactor: eFactor,
      });

      // Move to next card in the filtered list
      setShowAnswer(false);
      if (currentCardIndex < flashcards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        setModalContent({ title: 'Review Complete!', message: 'You have reviewed all due flashcards for today!' });
        setShowModal(true);
        setCurrentCardIndex(0); // Reset to beginning if more cards become due
      }

    } catch (e) {
      console.error("Error updating flashcard review: ", e);
      setModalContent({ title: 'Error', message: 'Failed to update flashcard review. Please try again.' });
      setShowModal(true);
    }
  };

  const deleteFlashcard = async (id) => {
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/flashcards`, id));
    } catch (e) {
      console.error("Error deleting flashcard: ", e);
      setModalContent({ title: 'Error', message: 'Failed to delete flashcard. Please try again.' });
      setShowModal(true);
    }
  };

  const currentCard = flashcards[currentCardIndex];

  return (
    <Card className="w-full h-full flex flex-col p-4 md:p-6">
      <h2 className="text-3xl text-[#FF3C00] font-bold mb-6 uppercase">Flashcards</h2>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
        <h3 className="text-xl text-[#D1D1D1] font-bold">
          Cards Due: {flashcards.length} {flashcards.length > 0 && `(Card ${currentCardIndex + 1} of ${flashcards.length})`}
        </h3>
        <NeonButton onClick={() => setShowAddCardForm(!showAddCardForm)}>
          {showAddCardForm ? 'Hide Add Form' : 'Add New Card'}
        </NeonButton>
      </div>

      {showAddCardForm && (
        <Card className="mb-8 p-4 bg-[#0F0F0F] border border-[#222]">
          <h4 className="text-xl text-[#FF3C00] font-bold mb-4">Add New Flashcard</h4>
          <div className="space-y-4">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter question..."
              className="w-full bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-md focus:outline-none focus:border-[#FF3C00]"
            />
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Enter answer..."
              rows="3"
              className="w-full bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-md focus:outline-none focus:border-[#FF3C00]"
            ></textarea>
            <NeonButton onClick={addFlashcard} className="w-full">Save Card</NeonButton>
            {window.innerWidth < 768 && (
              <button onClick={() => setShowAddCardForm(false)} className="mt-2 text-gray-400 hover:text-red-500">Cancel</button>
            )}
          </div>
        </Card>
      )}
      {/* FAB for Add Card (mobile only) */}
      {window.innerWidth < 768 && (
        <FAB onClick={() => setShowAddCardForm(true)} label="Add Card" icon="+" />
      )}

      {flashcards.length > 0 && currentCard ? (
        <div className="flex flex-col flex-grow items-center justify-center text-center">
          <Card className="w-full max-w-lg min-h-[150px] flex flex-col justify-center items-center p-6 mb-6 transition-all duration-300 ease-in-out transform hover:scale-[1.02]">
            <p className="text-2xl text-[#D1D1D1] font-bold mb-4">{currentCard.question}</p>
            {showAnswer && (
              <p className="text-lg text-[#D1D1D1] leading-relaxed animate-fade-in">
                {currentCard.answer}
              </p>
            )}
          </Card>

          {!showAnswer ? (
            <NeonButton onClick={() => setShowAnswer(true)} className="mb-4">
              Show Answer
            </NeonButton>
          ) : (
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <NeonButton onClick={() => handleReview(0)} className="bg-red-600 hover:bg-red-700">Again</NeonButton>
              <NeonButton onClick={() => handleReview(2)} className="bg-yellow-600 hover:bg-yellow-700">Hard</NeonButton>
              <NeonButton onClick={() => handleReview(4)} className="bg-green-600 hover:bg-green-700">Good</NeonButton>
              <NeonButton onClick={() => handleReview(5)} className="bg-blue-600 hover:bg-blue-700">Easy</NeonButton>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col flex-grow items-center justify-center text-center">
          <p className="text-xl text-[#D1D1D1] opacity-70">No flashcards due for review today!</p>
          <p className="text-md text-[#D1D1D1] opacity-50 mt-2">Add new cards or check back later.</p>
        </div>
      )}

      {/* Flashcard Management */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-[#FF3C00] mb-4">All Flashcards</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {flashcards.map((card) => (
            <SwipeableItem
              key={card.id}
              onSwipeLeft={() => deleteFlashcard(card.id)}
              leftAction="Delete"
              leftColor="bg-red-500"
              className="mb-2"
            >
              <div className="bg-[#0F0F0F] p-3 rounded-br-lg border border-[#222]">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-[#D1D1D1] font-semibold mb-1">{card.question}</p>
                    <p className="text-gray-400 text-sm">{card.answer}</p>
                    <p className="text-xs text-[#FF3C00] mt-1">
                      Next Review: {card.nextReviewDate ? new Date(card.nextReviewDate).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </SwipeableItem>
          ))}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalContent.title}
        message={modalContent.message}
      />
    </Card>
  );
};

// --- Time Boxing Scheduler Component (Simulated Google Calendar) ---
const TimeBoxingScheduler = ({ userId, db }) => {
  const [events, setEvents] = useState([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const [showCompleted, setShowCompleted] = useState(true);
  const [pomodoroCounts, setPomodoroCounts] = useState({}); // eventId -> count
  const [showAddEventForm, setShowAddEventForm] = useState(false);

  const scheduledEventsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/scheduledEvents`);

  useEffect(() => {
    if (!userId) return;

    const q = query(scheduledEventsCollectionRef); // No orderBy here to avoid index issues, sort in client
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Ensure date fields are handled as Date objects for sorting/display
        date: doc.data().date, // Stored as 'YYYY-MM-DD'
        startTime: doc.data().startTime, // Stored as 'HH:MM'
        endTime: doc.data().endTime // Stored as 'HH:MM'
      }));

      // Sort events by date and then by start time
      fetchedEvents.sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.startTime}`);
        const dateTimeB = new Date(`${b.date}T${b.startTime}`);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });

      setEvents(fetchedEvents);
    }, (error) => {
      console.error("Error fetching scheduled events:", error);
      setModalContent({ title: 'Error', message: 'Failed to load scheduled events. Please try again.' });
      setShowModal(true);
    });

    return () => unsubscribe();
  }, [userId, db]);

  useEffect(() => {
    if (!userId || events.length === 0) return;
    const fetchCounts = async () => {
      const sessionsRef = collection(db, `artifacts/${appId}/users/${userId}/pomodoroSessions`);
      const q = query(sessionsRef, where('completed', '==', true));
      const snap = await getDocs(q);
      const counts = {};
      events.forEach(ev => { counts[ev.id] = 0; });
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.taskId && counts[data.taskId] !== undefined) {
          counts[data.taskId] += 1;
        }
      });
      setPomodoroCounts(counts);
    };
    fetchCounts();
  }, [userId, db, events]);

  const addEvent = async () => {
    if (newEventTitle.trim() === '' || newEventDate.trim() === '' || newEventStartTime.trim() === '' || newEventEndTime.trim() === '') {
      setModalContent({ title: 'Input Error', message: 'All fields are required to add an event.' });
      setShowModal(true);
      return;
    }

    // Basic time validation
    const startDateTime = new Date(`${newEventDate}T${newEventStartTime}`);
    const endDateTime = new Date(`${newEventDate}T${newEventEndTime}`);

    if (endDateTime <= startDateTime) {
      setModalContent({ title: 'Time Error', message: 'End time must be after start time.' });
      setShowModal(true);
      return;
    }

    try {
      await addDoc(scheduledEventsCollectionRef, {
        title: newEventTitle,
        date: newEventDate,
        startTime: newEventStartTime,
        endTime: newEventEndTime,
        createdAt: new Date().toISOString(),
      });
      setNewEventTitle('');
      setNewEventDate('');
      setNewEventStartTime('');
      setNewEventEndTime('');
    } catch (e) {
      console.error("Error adding event: ", e);
      setModalContent({ title: 'Error', message: 'Failed to add event. Please try again.' });
      setShowModal(true);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/scheduledEvents`, id));
    } catch (e) {
      console.error("Error deleting event: ", e);
      setModalContent({ title: 'Error', message: 'Failed to delete event. Please try again.' });
      setShowModal(true);
    }
  };

  const toggleEventCompletion = async (id, completed) => {
    try {
      await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/scheduledEvents`, id), {
        completed: !completed,
        completedAt: !completed ? new Date().toISOString() : null
      });
    } catch (e) {
      console.error("Error updating event completion: ", e);
      setModalContent({ title: 'Error', message: 'Failed to update event completion. Please try again.' });
      setShowModal(true);
    }
  };

  // Helper to format date-time for ICS
  const formatIcsDateTime = (date, time) => {
    const dt = new Date(`${date}T${time}`);
    // Convert to UTC and format as YYYYMMDDTHHMMSSZ
    return dt.toISOString().replace(/[-:]|\.\d{3}/g, '');
  };

  const exportEventsToIcs = () => {
    if (events.length === 0) {
      setModalContent({ title: 'No Events', message: 'There are no scheduled events to export.' });
      setShowModal(true);
      return;
    }

    let icsContent = `BEGIN:VCALENDAR\n`;
    icsContent += `VERSION:2.0\n`;
    icsContent += `PRODID:-//FocusForge//NONSGML v1.0//EN\n`;

    events.forEach(event => {
      const uid = `${event.id}-${new Date().getTime()}`; // Unique ID for the event
      const dtstamp = formatIcsDateTime(new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[1].substring(0, 5)); // Current UTC time
      const dtstart = formatIcsDateTime(event.date, event.startTime);
      const dtend = formatIcsDateTime(event.date, event.endTime);

      icsContent += `BEGIN:VEVENT\n`;
      icsContent += `UID:${uid}\n`;
      icsContent += `DTSTAMP:${dtstamp}\n`;
      icsContent += `DTSTART:${dtstart}\n`;
      icsContent += `DTEND:${dtend}\n`;
      icsContent += `SUMMARY:${event.title}\n`;
      icsContent += `DESCRIPTION:${event.title}\n`; // Using title as description for simplicity
      icsContent += `END:VEVENT\n`;
    });

    icsContent += `END:VCALENDAR\n`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'focusforge_schedule.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up the URL object
  };


  // Group events by date for better display
  const groupedEvents = events.reduce((acc, event) => {
    const date = event.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort();

  // Add a BottomSheet component for mobile
  const BottomSheet = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black bg-opacity-40">
        <div className="w-full max-w-md bg-[#181818] rounded-t-2xl p-6 shadow-2xl animate-slide-up relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-4 text-2xl text-gray-400 hover:text-[#FF3C00]"
            aria-label="Close"
          >
            ×
          </button>
          {children}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full h-full flex flex-col p-4 md:p-6">
      <h2 className="text-3xl text-[#FF3C00] font-bold mb-6 uppercase">Scheduler</h2>
      <p className="text-[#D1D1D1] mb-6 text-sm leading-relaxed">
        Plan your focused work blocks and important tasks using the time boxing method.
      </p>

      {/* Add New Event Form */}
      {window.innerWidth < 768 ? (
        <BottomSheet isOpen={showAddEventForm} onClose={() => setShowAddEventForm(false)}>
          <h3 className="text-xl text-[#FF3C00] font-bold mb-4">Add New Time Box</h3>
          <div className="space-y-4">
            <input
              type="text"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              placeholder="Event Title"
              className="w-full bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-4 rounded-lg text-lg focus:outline-none focus:border-[#FF3C00]"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="flex-1 bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-4 rounded-lg text-lg focus:outline-none focus:border-[#FF3C00]"
              />
              <input
                type="time"
                value={newEventStartTime}
                onChange={(e) => setNewEventStartTime(e.target.value)}
                className="flex-1 bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-4 rounded-lg text-lg focus:outline-none focus:border-[#FF3C00]"
              />
              <input
                type="time"
                value={newEventEndTime}
                onChange={(e) => setNewEventEndTime(e.target.value)}
                className="flex-1 bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-4 rounded-lg text-lg focus:outline-none focus:border-[#FF3C00]"
              />
            </div>
            <NeonButton onClick={addEvent} className="w-full py-4 text-xl">Add Event</NeonButton>
          </div>
        </BottomSheet>
      ) : (
        (showAddEventForm || window.innerWidth >= 768) && (
          <Card className="mb-8 p-4 bg-[#0F0F0F] border border-[#222]">
            <h3 className="text-xl text-[#FF3C00] font-bold mb-4">Add New Time Box</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Event Title"
                className="bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-md focus:outline-none focus:border-[#FF3C00]"
              />
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-md focus:outline-none focus:border-[#FF3C00]"
              />
              <input
                type="time"
                value={newEventStartTime}
                onChange={(e) => setNewEventStartTime(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-md focus:outline-none focus:border-[#FF3C00]"
              />
              <input
                type="time"
                value={newEventEndTime}
                onChange={(e) => setNewEventEndTime(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-md focus:outline-none focus:border-[#FF3C00]"
              />
            </div>
            <div className="flex justify-between gap-4">
              <NeonButton onClick={addEvent} className="flex-grow">Add Event</NeonButton>
              <NeonButton onClick={exportEventsToIcs} className="flex-grow">Export to Calendar</NeonButton>
              {window.innerWidth < 768 && (
                <button onClick={() => setShowAddEventForm(false)} className="ml-2 text-gray-400 hover:text-red-500">Cancel</button>
              )}
            </div>
          </Card>
        )
      )}
      {/* FAB for Add Event (mobile only) */}
      {window.innerWidth < 768 && (
        <FAB onClick={() => setShowAddEventForm(true)} label="Add Event" icon="+" />
      )}

      {/* Scheduled Events List */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl text-[#FF3C00] font-bold uppercase">Scheduled Events</h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              const todaySection = document.getElementById('today-section');
              if (todaySection) todaySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="px-3 py-1 bg-[#FF3C00] text-white rounded-lg text-sm font-bold shadow hover:bg-orange-600 transition-all duration-200"
          >
            Today
          </button>
          <label className="flex items-center text-[#D1D1D1]">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="mr-2 text-[#FF3C00] bg-black border-gray-600 rounded focus:ring-[#FF3C00]"
            />
            Show Completed
          </label>
        </div>
      </div>
      <div className="mb-2">
        <p className="text-xs text-gray-500 text-center">💡 Swipe right to complete, left to delete</p>
      </div>
      <div className="flex-grow overflow-y-auto pr-2">
        {sortedDates.length === 0 ? (
          <p className="text-center text-[#D1D1D1] opacity-70">No events scheduled. Add one above!</p>
        ) : (
          sortedDates.map(date => {
            const filteredEvents = groupedEvents[date].filter(event => 
              showCompleted || !event.completed
            );
            if (filteredEvents.length === 0) return null;
            const isToday = date === new Date().toISOString().slice(0, 10);
            return (
              <div key={date} className="mb-6" {...(isToday ? { id: 'today-section' } : {})}>
                <h4 className="text-xl text-[#FF3C00] font-bold mb-3 border-b border-[#333] pb-2">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h4>
                <ul className="space-y-2">
                  {filteredEvents.map(event => (
                    <SwipeableItem
                      key={event.id}
                      onSwipeLeft={() => deleteEvent(event.id)}
                      onSwipeRight={() => toggleEventCompletion(event.id, event.completed || false)}
                      leftAction="Delete"
                      rightAction={event.completed ? "Undo" : "Complete"}
                      leftColor="bg-red-500"
                      rightColor={event.completed ? "bg-yellow-500" : "bg-green-500"}
                    >
                      <li className={`bg-[#0F0F0F] p-3 rounded-br-lg border border-[#222] flex justify-between items-center transition-all duration-200 ${
                        event.completed ? 'opacity-60 bg-[#0a0a0a]' : ''
                      }`}>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={event.completed || false}
                            onChange={() => toggleEventCompletion(event.id, event.completed || false)}
                            className="h-5 w-5 text-[#FF3C00] bg-black border-gray-600 rounded focus:ring-[#FF3C00]"
                          />
                          <div>
                            <p className={`text-lg font-bold ${event.completed ? 'line-through text-gray-500' : 'text-[#D1D1D1]'}`}>
                              {event.title}
                            </p>
                            <p className="text-sm text-gray-400">{event.startTime} - {event.endTime}</p>
                            {event.completed && event.completedAt && (
                              <p className="text-xs text-green-500">
                                Completed: {new Date(event.completedAt).toLocaleString()}
                              </p>
                            )}
                            {/* Pomodoro count */}
                            <p className="text-xs text-[#FF3C00] mt-1">🍅 Pomodoros: {pomodoroCounts[event.id] || 0}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1"
                          title="Delete Event"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </li>
                    </SwipeableItem>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalContent.title}
        message={modalContent.message}
      />
    </Card>
  );
};


// --- LanguagesToLearn Component ---
const LanguagesToLearn = () => {
  const languages = [
    {
      name: "English",
      description: "The most widely spoken language globally, essential for international business, science, and technology. It's the lingua franca of the internet and global communication.",
      why: "Global communication, business, science, technology, internet."
    },
    {
      name: "Mandarin Chinese",
      description: "The most spoken language by native speakers and the official language of China, a major global economic power. Learning it opens doors to a vast market and rich culture.",
      why: "Largest native speaker population, major global economy, rich culture."
    },
    {
      name: "Spanish",
      description: "Widely spoken across Latin America and Spain, with a significant presence in the United States. It offers access to diverse cultures and growing economies.",
      why: "Extensive global reach, growing economies, diverse cultures."
    },
    {
      name: "Arabic",
      description: "The official language of 25 countries across the Middle East and North Africa, a region of significant geopolitical and economic importance. It's also the language of Islam.",
      why: "Geopolitical and economic importance, rich history, diverse cultures."
    },
    {
      name: "French",
      description: "Spoken across five continents and an official language in 29 countries. It's important in diplomacy, international organizations, and has a rich cultural heritage.",
      why: "Diplomacy, international organizations, rich cultural heritage."
    },
    {
      name: "Dutch",
      description: "While not as globally widespread, Dutch is the language of the Netherlands and parts of Belgium, both countries with high GDP per capita and strong innovation sectors.",
      why: "High GDP per capita countries, strong innovation sectors, unique culture."
    },
    {
      name: "Russian",
      description: "One of the most widely spoken Slavic languages, serving as a significant language in Eastern Europe and Central Asia. It holds importance in global politics, science, and rich literary tradition.",
      why: "Global politics, science, rich literary tradition, Eastern Europe and Central Asia."
    }
  ];

  return (
    <Card className="w-full h-full flex flex-col p-4 md:p-6">
      <h2 className="text-3xl text-[#FF3C00] font-bold mb-6 uppercase">Languages to Learn</h2>
      <p className="text-[#D1D1D1] mb-6 text-sm leading-relaxed">
        Expand your horizons and boost your cognitive abilities by learning new languages. Here are some of the most perspective languages to consider:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-y-auto pr-2">
        {languages.map((lang, index) => (
          <Card key={index} className="p-4 bg-[#0F0F0F] border border-[#222]">
            <h3 className="text-xl text-[#FF3C00] font-bold mb-2">{lang.name}</h3>
            <p className="text-sm text-[#D1D1D1] mb-2">{lang.description}</p>
            <p className="text-xs text-gray-500">Why learn: {lang.why}</p>
          </Card>
        ))}
      </div>
    </Card>
  );
};


// --- Training Hub Component ---
const TrainingHub = ({ userId, db }) => {
  const [currentSection, setCurrentSection] = useState('braverman');
  const [showBravermanTest, setShowBravermanTest] = useState(false);

  const handleRetakeBraverman = () => {
    setShowBravermanTest(true);
  };

  if (showBravermanTest) {
    return <BravermanTest onRetake={() => setShowBravermanTest(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#FF3C00] mb-4">🧠 Training Hub</h2>
        <p className="text-[#D1D1D1] mb-8">Enhance your cognitive performance with targeted training</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:border-[#FF3C00] transition-all duration-200 cursor-pointer">
          <button
            onClick={() => setCurrentSection('braverman')}
            className={`w-full text-left ${currentSection === 'braverman' ? 'text-[#FF3C00]' : 'text-[#D1D1D1]'}`}
          >
            <h3 className="text-xl font-bold mb-2">🧪 Braverman Test</h3>
            <p className="text-sm">Assess your neurotransmitter balance and get personalized recommendations</p>
          </button>
        </Card>

        <Card className="hover:border-[#FF3C00] transition-all duration-200 cursor-pointer">
          <button
            onClick={() => setCurrentSection('languages')}
            className={`w-full text-left ${currentSection === 'languages' ? 'text-[#FF3C00]' : 'text-[#D1D1D1]'}`}
          >
            <h3 className="text-xl font-bold mb-2">🌍 Language Learning</h3>
            <p className="text-sm">Track your language learning progress and set goals</p>
          </button>
        </Card>

        <Card className="hover:border-[#FF3C00] transition-all duration-200 cursor-pointer">
          <button
            onClick={() => setCurrentSection('flashcards')}
            className={`w-full text-left ${currentSection === 'flashcards' ? 'text-[#FF3C00]' : 'text-[#D1D1D1]'}`}
          >
            <h3 className="text-xl font-bold mb-2">🗂️ Flashcards</h3>
            <p className="text-sm">Spaced repetition learning system for optimal retention</p>
          </button>
        </Card>
      </div>

      <div className="mt-8">
        {currentSection === 'braverman' && (
          <Card>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#FF3C00] mb-4">🧪 Braverman Test</h3>
              <p className="text-[#D1D1D1] mb-6">
                The Braverman Test assesses your neurotransmitter balance to provide personalized recommendations for cognitive enhancement.
              </p>
              <NeonButton onClick={handleRetakeBraverman}>
                Take Braverman Test
              </NeonButton>
            </div>
          </Card>
        )}

        {currentSection === 'languages' && <LanguagesToLearn />}
        {currentSection === 'flashcards' && <Flashcards userId={userId} db={db} />}
      </div>
    </div>
  );
};

// --- Progress Visualization Component ---
const Progress = ({ userId, db }) => {
  const [timeRange, setTimeRange] = useState('week'); // 'day', 'week', 'month'
  const [productivityData, setProductivityData] = useState({
    pomodoros: [],
    tasks: [],
    focusTime: []
  });
  const [loading, setLoading] = useState(true);

  const progressCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/progress`);

  useEffect(() => {
    if (!userId) return;

    const fetchProgressData = async () => {
      setLoading(true);
      try {
        // Get date range
        const now = new Date();
        let startDate;
        switch (timeRange) {
          case 'day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        // Fetch pomodoro sessions
        const pomodoroQuery = query(
          collection(db, `artifacts/${appId}/users/${userId}/pomodoroSessions`),
          where('startTime', '>=', startDate),
          orderBy('startTime', 'desc')
        );

        // Fetch completed tasks
        const tasksQuery = query(
          collection(db, `artifacts/${appId}/users/${userId}/tasks`),
          where('completed', '==', true),
          where('completedAt', '>=', startDate),
          orderBy('completedAt', 'desc')
        );

        const [pomodoroSnapshot, tasksSnapshot] = await Promise.all([
          getDocs(pomodoroQuery),
          getDocs(tasksQuery)
        ]);

        const pomodoros = pomodoroSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const tasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setProductivityData({ pomodoros, tasks, focusTime: [] });
      } catch (error) {
        console.error("Error fetching progress data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [userId, timeRange]);

  // Calculate statistics
  const stats = {
    totalPomodoros: productivityData.pomodoros.length,
    totalTasks: productivityData.tasks.length,
    totalFocusTime: productivityData.pomodoros.reduce((total, session) => {
      const duration = session.duration || 25; // Default 25 minutes
      return total + duration;
    }, 0),
    averagePomodorosPerDay: timeRange === 'day' ? productivityData.pomodoros.length : 
                           productivityData.pomodoros.length / (timeRange === 'week' ? 7 : 30)
  };

  // Generate chart data
  const generateChartData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < (timeRange === 'day' ? 24 : timeRange === 'week' ? 7 : 30); i++) {
      const date = new Date(now);
      if (timeRange === 'day') {
        date.setHours(date.getHours() - i);
      } else {
        date.setDate(date.getDate() - i);
      }
      
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      if (timeRange === 'day') {
        dayStart.setMinutes(0, 0, 0);
        dayEnd.setMinutes(59, 59, 999);
      } else {
        dayStart.setHours(0, 0, 0, 0);
        dayEnd.setHours(23, 59, 59, 999);
      }

      const dayPomodoros = productivityData.pomodoros.filter(session => {
        const sessionTime = session.startTime?.toDate?.() || new Date(session.startTime);
        return sessionTime >= dayStart && sessionTime <= dayEnd;
      });

      const dayTasks = productivityData.tasks.filter(task => {
        const taskTime = task.completedAt?.toDate?.() || new Date(task.completedAt);
        return taskTime >= dayStart && taskTime <= dayEnd;
      });

      data.unshift({
        label: timeRange === 'day' ? `${dayStart.getHours()}:00` : dayStart.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        pomodoros: dayPomodoros.length,
        tasks: dayTasks.length
      });
    }
    
    return data;
  };

  const chartData = generateChartData();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#FF3C00] mb-4">📊 Progress Dashboard</h2>
        <p className="text-[#D1D1D1] mb-8">Track your productivity and focus metrics</p>
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-center mb-6">
        <div className="bg-[#1a1a1a] rounded-lg p-1 border border-[#333]">
          {['day', 'week', 'month'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md transition-all duration-200 capitalize ${
                timeRange === range 
                  ? 'bg-[#FF3C00] text-white' 
                  : 'text-[#D1D1D1] hover:text-[#FF3C00]'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF3C00] mx-auto mb-4"></div>
            <p className="text-[#D1D1D1]">Loading progress data...</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="text-center">
              <div className="text-3xl font-bold text-[#FF3C00] mb-2">{stats.totalPomodoros}</div>
              <div className="text-[#D1D1D1] text-sm">Pomodoros</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-[#FF3C00] mb-2">{stats.totalTasks}</div>
              <div className="text-[#D1D1D1] text-sm">Tasks Completed</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-[#FF3C00] mb-2">{stats.totalFocusTime}</div>
              <div className="text-[#D1D1D1] text-sm">Minutes Focused</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-[#FF3C00] mb-2">{stats.averagePomodorosPerDay.toFixed(1)}</div>
              <div className="text-[#D1D1D1] text-sm">Avg Pomodoros/Day</div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pomodoros Chart */}
            <Card>
              <h3 className="text-xl font-bold text-[#FF3C00] mb-4">Pomodoros Completed</h3>
              <div className="h-64 flex items-end justify-between space-x-1">
                {chartData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-[#FF3C00] rounded-t transition-all duration-300 hover:bg-[#FF3C00]/80"
                      style={{ 
                        height: `${Math.max((data.pomodoros / Math.max(...chartData.map(d => d.pomodoros))) * 200, 4)}px` 
                      }}
                    ></div>
                    <div className="text-xs text-[#D1D1D1] mt-2 text-center">
                      {data.label}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tasks Chart */}
            <Card>
              <h3 className="text-xl font-bold text-[#FF3C00] mb-4">Tasks Completed</h3>
              <div className="h-64 flex items-end justify-between space-x-1">
                {chartData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-400"
                      style={{ 
                        height: `${Math.max((data.tasks / Math.max(...chartData.map(d => d.tasks))) * 200, 4)}px` 
                      }}
                    ></div>
                    <div className="text-xs text-[#D1D1D1] mt-2 text-center">
                      {data.label}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <h3 className="text-xl font-bold text-[#FF3C00] mb-4">Recent Activity</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {productivityData.pomodoros.slice(0, 5).map((session, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg">
                  <div className="flex items-center">
                    <span className="text-[#FF3C00] mr-3">⏰</span>
                    <div>
                      <div className="text-[#D1D1D1] font-semibold">Pomodoro Session</div>
                      <div className="text-sm text-gray-500">
                        {session.startTime?.toDate?.().toLocaleString() || 'Recent'}
                      </div>
                    </div>
                  </div>
                  <div className="text-[#FF3C00] font-bold">{session.duration || 25}min</div>
                </div>
              ))}
              {productivityData.tasks.slice(0, 5).map((task, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✅</span>
                    <div>
                      <div className="text-[#D1D1D1] font-semibold">{task.text}</div>
                      <div className="text-sm text-gray-500">
                        {task.completedAt?.toDate?.().toLocaleString() || 'Recent'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {productivityData.pomodoros.length === 0 && productivityData.tasks.length === 0 && (
                <div className="text-center text-[#D1D1D1] py-8">
                  No activity yet. Start using the Pomodoro timer and completing tasks to see your progress!
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

// --- Notes Component ---
const Notes = ({ userId, db }) => {
  const [noteType, setNoteType] = useState('bullet'); // 'bullet' or 'daily'
  const [bulletNote, setBulletNote] = useState('');
  const [dailyReport, setDailyReport] = useState({
    health: '',
    wealth: '',
    knowledge: '',
    relationships: ''
  });
  const [notes, setNotes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);

  const notesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/notes`);

  useEffect(() => {
    if (!userId) return;

    const q = query(notesCollectionRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotes(fetchedNotes);
    }, (error) => {
      console.error("Error fetching notes:", error);
      setModalContent({ title: 'Error', message: 'Failed to load notes. Please try again.' });
      setShowModal(true);
    });

    return () => unsubscribe();
  }, [userId, db]);

  const addBulletNote = async () => {
    if (bulletNote.trim() === '') {
      setModalContent({ title: 'Input Error', message: 'Note cannot be empty.' });
      setShowModal(true);
      return;
    }

    if (bulletNote.length > 150) {
      setModalContent({ title: 'Input Error', message: 'Bullet note cannot exceed 150 characters.' });
      setShowModal(true);
      return;
    }

    try {
      await addDoc(notesCollectionRef, {
        type: 'bullet',
        content: bulletNote,
        createdAt: new Date()
      });
      setBulletNote('');
    } catch (e) {
      console.error("Error adding bullet note: ", e);
      setModalContent({ title: 'Error', message: 'Failed to add note. Please try again.' });
      setShowModal(true);
    }
  };

  const addDailyReport = async () => {
    const totalLength = Object.values(dailyReport).join('').length;
    
    if (totalLength === 0) {
      setModalContent({ title: 'Input Error', message: 'Daily report cannot be empty.' });
      setShowModal(true);
      return;
    }

    if (totalLength > 400) {
      setModalContent({ title: 'Input Error', message: 'Daily report cannot exceed 400 characters total.' });
      setShowModal(true);
      return;
    }

    try {
      await addDoc(notesCollectionRef, {
        type: 'daily',
        content: dailyReport,
        createdAt: new Date()
      });
      setDailyReport({ health: '', wealth: '', knowledge: '', relationships: '' });
    } catch (e) {
      console.error("Error adding daily report: ", e);
      setModalContent({ title: 'Error', message: 'Failed to add daily report. Please try again.' });
      setShowModal(true);
    }
  };

  const deleteNote = async (id) => {
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/notes/${id}`));
    } catch (e) {
      console.error("Error deleting note: ", e);
      setModalContent({ title: 'Error', message: 'Failed to delete note. Please try again.' });
      setShowModal(true);
    }
  };

  const formatDate = (date) => {
    return new Date(date.toDate()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#FF3C00] mb-4">📝 Notes</h2>
        <p className="text-[#D1D1D1] mb-8">Capture your thoughts and track your daily progress</p>
      </div>

      {/* Note Type Selector */}
      <div className="flex justify-center mb-6">
        <div className="bg-[#1a1a1a] rounded-lg p-1 border border-[#333]">
          <button
            onClick={() => setNoteType('bullet')}
            className={`px-4 py-2 rounded-md transition-all duration-200 ${
              noteType === 'bullet' 
                ? 'bg-[#FF3C00] text-white' 
                : 'text-[#D1D1D1] hover:text-[#FF3C00]'
            }`}
          >
            Bullet Notes
          </button>
          <button
            onClick={() => setNoteType('daily')}
            className={`px-4 py-2 rounded-md transition-all duration-200 ${
              noteType === 'daily' 
                ? 'bg-[#FF3C00] text-white' 
                : 'text-[#D1D1D1] hover:text-[#FF3C00]'
            }`}
          >
            Daily Report
          </button>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        {noteType === 'bullet' ? (
          <div>
            <h3 className="text-xl font-bold text-[#FF3C00] mb-4">Quick Bullet Note</h3>
            <div className="space-y-4">
              <div>
                <textarea
                  value={bulletNote}
                  onChange={(e) => setBulletNote(e.target.value)}
                  placeholder="Enter your quick note (max 150 characters)..."
                  className="w-full p-3 bg-[#0F0F0F] border border-[#333] rounded-lg text-[#D1D1D1] resize-none"
                  rows="3"
                  maxLength="150"
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {bulletNote.length}/150
                </div>
              </div>
              <NeonButton onClick={addBulletNote} className="w-full">Add Bullet Note</NeonButton>
              {window.innerWidth < 768 && (
                <button onClick={() => setShowAddNoteForm(false)} className="mt-2 text-gray-400 hover:text-red-500">Cancel</button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-bold text-[#FF3C00] mb-4">Daily Development Report</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#D1D1D1] mb-2 font-semibold">🏥 Health</label>
                  <textarea
                    value={dailyReport.health}
                    onChange={(e) => setDailyReport({...dailyReport, health: e.target.value})}
                    placeholder="Health updates..."
                    className="w-full p-3 bg-[#0F0F0F] border border-[#333] rounded-lg text-[#D1D1D1] resize-none"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-[#D1D1D1] mb-2 font-semibold">💰 Wealth</label>
                  <textarea
                    value={dailyReport.wealth}
                    onChange={(e) => setDailyReport({...dailyReport, wealth: e.target.value})}
                    placeholder="Financial progress..."
                    className="w-full p-3 bg-[#0F0F0F] border border-[#333] rounded-lg text-[#D1D1D1] resize-none"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-[#D1D1D1] mb-2 font-semibold">📚 Knowledge</label>
                  <textarea
                    value={dailyReport.knowledge}
                    onChange={(e) => setDailyReport({...dailyReport, knowledge: e.target.value})}
                    placeholder="Learning achievements..."
                    className="w-full p-3 bg-[#0F0F0F] border border-[#333] rounded-lg text-[#D1D1D1] resize-none"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-[#D1D1D1] mb-2 font-semibold">🤝 Relationships</label>
                  <textarea
                    value={dailyReport.relationships}
                    onChange={(e) => setDailyReport({...dailyReport, relationships: e.target.value})}
                    placeholder="Social connections..."
                    className="w-full p-3 bg-[#0F0F0F] border border-[#333] rounded-lg text-[#D1D1D1] resize-none"
                    rows="2"
                  />
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                {Object.values(dailyReport).join('').length}/400 characters
              </div>
              <NeonButton onClick={addDailyReport} className="w-full">Save Daily Report</NeonButton>
              {window.innerWidth < 768 && (
                <button onClick={() => setShowAddNoteForm(false)} className="mt-2 text-gray-400 hover:text-red-500">Cancel</button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Notes Display */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-[#FF3C00]">Recent Notes</h3>
        {notes.length === 0 ? (
          <Card>
            <p className="text-[#D1D1D1] text-center">No notes yet. Start by adding your first note!</p>
          </Card>
        ) : (
          notes.map(note => (
            <SwipeableItem
              key={note.id}
              onSwipeLeft={() => deleteNote(note.id)}
              leftAction="Delete"
              leftColor="bg-red-500"
              className="mb-4"
            >
              <Card className="relative">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-500">
                    {formatDate(note.createdAt)}
                  </span>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-red-500 hover:text-red-400 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              
              {note.type === 'bullet' ? (
                <div className="flex items-start">
                  <span className="text-[#FF3C00] mr-2 mt-1">•</span>
                  <p className="text-[#D1D1D1] flex-1">{note.content}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {note.content.health && (
                      <div>
                        <span className="text-[#FF3C00] font-semibold">🏥 Health:</span>
                        <p className="text-[#D1D1D1] text-sm">{note.content.health}</p>
                      </div>
                    )}
                    {note.content.wealth && (
                      <div>
                        <span className="text-[#FF3C00] font-semibold">💰 Wealth:</span>
                        <p className="text-[#D1D1D1] text-sm">{note.content.wealth}</p>
                      </div>
                    )}
                    {note.content.knowledge && (
                      <div>
                        <span className="text-[#FF3C00] font-semibold">📚 Knowledge:</span>
                        <p className="text-[#D1D1D1] text-sm">{note.content.knowledge}</p>
                      </div>
                    )}
                    {note.content.relationships && (
                      <div>
                        <span className="text-[#FF3C00] font-semibold">🤝 Relationships:</span>
                        <p className="text-[#D1D1D1] text-sm">{note.content.relationships}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </Card>
            </SwipeableItem>
          ))
        )}
      </div>

      {/* Add Note Form (for bullet or daily) */}
      {(showAddNoteForm || window.innerWidth >= 768) && (
        <Card className="mb-8 p-4 bg-[#0F0F0F] border border-[#222]">
          <h4 className="text-xl text-[#FF3C00] font-bold mb-4">Add Note</h4>
          <div className="space-y-4">
            <textarea
              value={noteType === 'bullet' ? bulletNote : dailyReport[noteType === 'daily' ? 'health' : 'wealth']}
              onChange={(e) => {
                if (noteType === 'bullet') {
                  setBulletNote(e.target.value);
                } else {
                  setDailyReport({ ...dailyReport, [noteType === 'daily' ? 'health' : 'wealth']: e.target.value });
                }
              }}
              placeholder={`Enter your ${noteType === 'bullet' ? 'bullet' : 'daily'} note...`}
              className="w-full p-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-[#D1D1D1] resize-none"
              rows="3"
            />
            <NeonButton onClick={noteType === 'bullet' ? addBulletNote : addDailyReport} className="w-full">Add Note</NeonButton>
            {window.innerWidth < 768 && (
              <button onClick={() => setShowAddNoteForm(false)} className="mt-2 text-gray-400 hover:text-red-500">Cancel</button>
            )}
          </div>
        </Card>
      )}
      {/* FAB for Add Note (mobile only) */}
      {window.innerWidth < 768 && (
        <FAB onClick={() => setShowAddNoteForm(true)} label="Add Note" icon="+" />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalContent.title}
        message={modalContent.message}
      />
    </div>
  );
};

// --- Dashboard Component ---
const Dashboard = ({ userId, userEmail, db, onLogout }) => {
  const [currentSection, setCurrentSection] = useState('plan'); // 'plan', 'act', 'review', 'library'
  const [currentPage, setCurrentPage] = useState('scheduler'); // Default page within section
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [showMobileHome, setShowMobileHome] = useState(true); // Changed to true to show menu by default

  const renderContent = () => {
    switch (currentSection) {
      case 'plan':
        switch (currentPage) {
          case 'scheduler':
            return <TimeBoxingScheduler userId={userId} db={db} />;
          default:
            return <TimeBoxingScheduler userId={userId} db={db} />;
        }
      case 'act':
        switch (currentPage) {
          case 'pomodoro':
            return <PomodoroTimer userId={userId} db={db} />;
          case 'binaural':
            return <BinauralBeats />;
          default:
            return <PomodoroTimer userId={userId} db={db} />;
        }
      case 'review':
        switch (currentPage) {
          case 'notes':
            return <Notes userId={userId} db={db} />;
          case 'progress':
            return <Progress userId={userId} db={db} />;
          default:
            return <Notes userId={userId} db={db} />;
        }
      case 'library':
        switch (currentPage) {
          case 'guides':
            return <FocusGuides />;
          case 'nootropics':
            return <Nootropics />;
          case 'training':
            return <TrainingHub userId={userId} db={db} />;
          case 'admin':
            return <AdminPanel db={db} />;
          default:
            return <FocusGuides />;
        }
      default:
        return <TimeBoxingScheduler userId={userId} db={db} />;
    }
  };

  // Mobile home view with sections
  const renderMobileHome = () => {
    const sections = [
      { 
        id: 'plan', 
        label: 'Plan', 
        icon: '◉', 
        description: 'Schedule and organize your tasks',
        pages: [
          { id: 'scheduler', label: 'Scheduler', icon: '◉', description: 'Time-boxing with task management' }
        ]
      },
      { 
        id: 'act', 
        label: 'Act', 
        icon: '▶', 
        description: 'Focus and productivity tools',
        pages: [
          { id: 'pomodoro', label: 'Pomodoro Timer', icon: '◉', description: 'Focus timer with task management' },
          { id: 'binaural', label: 'Binaural Beats', icon: '◉', description: 'Audio-based focus enhancement' }
        ]
      },
      { 
        id: 'review', 
        label: 'Review', 
        icon: '◉', 
        description: 'Track your progress and insights',
        pages: [
          { id: 'notes', label: 'Notes', icon: '◉', description: 'Bullet notes and daily reports' },
          { id: 'progress', label: 'Progress', icon: '◉', description: 'Productivity charts and stats' }
        ]
      },
      { 
        id: 'library', 
        label: 'Library', 
        icon: '◉', 
        description: 'Knowledge and training resources',
        pages: [
          { id: 'guides', label: 'Guides', icon: '◉', description: 'Productivity techniques and tips' },
          { id: 'nootropics', label: 'Nootropics', icon: '◉', description: 'Supplement stacks for cognitive enhancement' },
          { id: 'training', label: 'Training Hub', icon: '◉', description: 'Cognitive enhancement and flashcards' }
        ]
      }
    ];

    return (
      <div className="p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-extrabold text-[#FF3C00] uppercase tracking-widest mb-2">
            FocusForge
          </h1>
          <p className="text-lg text-[#D1D1D1]">Choose your productivity tool</p>
        </div>
        <h2 className="text-2xl font-bold text-[#FF3C00] mb-6 text-center">Sections</h2>
        <div className="grid grid-cols-1 gap-4">
          {sections.map(section => (
            <Card key={section.id} className="p-4 hover:border-[#FF3C00] transition-all duration-200">
              <div className="mb-3">
                <div className="flex items-center mb-2">
                  <span className="text-3xl mr-4">{section.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-[#FF3C00]">{section.label}</h3>
                    <p className="text-sm text-[#D1D1D1]">{section.description}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {section.pages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => {
                      setCurrentSection(section.id);
                      setCurrentPage(page.id);
                      setShowMobileHome(false);
                    }}
                    className="w-full text-left p-2 bg-[#0F0F0F] rounded-lg hover:bg-[#1a1a1a] transition-all duration-200"
                  >
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{page.icon}</span>
                      <div>
                        <h4 className="text-sm font-semibold text-[#D1D1D1]">{page.label}</h4>
                        <p className="text-xs text-gray-500">{page.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main Content Area - takes up space above bottom nav on mobile */}
      <main className={`flex-grow p-4 md:p-8 overflow-auto pb-16 transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'}`}> {/* Added pb-16 for bottom nav space */}
        {/* Mobile page header - only show on mobile when not in home view */}
        {!showMobileHome && (
          <div className="md:hidden mb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-[#FF3C00]">
                {currentSection === 'plan' && currentPage === 'scheduler' && '🗓️ Scheduler'}
                {currentSection === 'act' && currentPage === 'pomodoro' && '⏰ Pomodoro Timer'}
                {currentSection === 'act' && currentPage === 'binaural' && '🎧 Binaural Beats'}
                {currentSection === 'review' && currentPage === 'notes' && '📝 Notes'}
                {currentSection === 'review' && currentPage === 'progress' && '📊 Progress'}
                {currentSection === 'library' && currentPage === 'guides' && '📖 Guides'}
                {currentSection === 'library' && currentPage === 'nootropics' && '💊 Nootropics'}
                {currentSection === 'library' && currentPage === 'training' && '🧠 Training Hub'}
                {currentSection === 'library' && currentPage === 'admin' && '🛠️ Admin'}
              </h1>
              <button
                onClick={() => setShowMobileHome(true)}
                className="text-[#FF3C00] hover:text-[#FF3C00] text-lg"
              >
                🏠
              </button>
            </div>
          </div>
        )}
        
        {/* Show mobile home view or regular content */}
        {showMobileHome ? renderMobileHome() : renderContent()}
      </main>

      {/* Sidebar Navigation - Hidden on small screens, visible on md and up */}
      <nav
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
        className={`hidden md:flex bg-[#1a1a1a] p-4 flex-col border-r border-[#333] shadow-lg fixed inset-y-0 left-0 transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-64' : 'w-20'}`}
      >
        <div className={`mb-6 text-center md:text-left overflow-hidden whitespace-nowrap transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0'}`}>
          <h2 className="text-3xl font-extrabold text-[#FF3C00] uppercase tracking-wider">FocusForge</h2>
          <p className="text-xs text-gray-500 mt-1">User ID: {userId}</p>
        </div>
        <ul className="flex flex-col space-y-4 flex-grow">
          {/* Section Navigation */}
          {[
            { 
              id: 'plan', 
              label: 'Plan', 
              icon: '◉',
              pages: [
                { id: 'scheduler', label: 'Scheduler', icon: '◉' }
              ]
            },
            { 
              id: 'act', 
              label: 'Act', 
              icon: '▶',
              pages: [
                { id: 'pomodoro', label: 'Pomodoro Timer', icon: '◉' },
                { id: 'binaural', label: 'Binaural Beats', icon: '◉' }
              ]
            },
            { 
              id: 'review', 
              label: 'Review', 
              icon: '◉',
              pages: [
                { id: 'notes', label: 'Notes', icon: '◉' },
                { id: 'progress', label: 'Progress', icon: '◉' }
              ]
            },
            { 
              id: 'library', 
              label: 'Library', 
              icon: '◉',
              pages: [
                { id: 'guides', label: 'Guides', icon: '◉' },
                { id: 'nootropics', label: 'Nootropics', icon: '◉' },
                { id: 'training', label: 'Training Hub', icon: '◉' },
                ...(userEmail === ADMIN_EMAIL ? [{ id: 'admin', label: 'Admin', icon: '◉' }] : [])
              ]
            }
          ].map(section => (
            <li key={section.id} className="space-y-2">
              {/* Section Header */}
              <div className={`text-sm font-bold text-gray-500 px-2 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0'}`}>
                {section.label}
              </div>
              
              {/* Section Pages */}
              {section.pages.map(page => (
                <button
                  key={page.id}
                  onClick={() => {
                    setCurrentSection(section.id);
                    setCurrentPage(page.id);
                  }}
                  className={`block w-full text-left text-base sm:text-xl py-2 px-2 rounded-br-lg transition-all duration-200
                              ${currentSection === section.id && currentPage === page.id ? 'bg-[#FF3C00] text-white shadow-md' : 'text-[#D1D1D1] hover:bg-[#0F0F0F] hover:text-[#FF3C00]'}
                              flex items-center`}
                >
                  <span className="w-8 flex-shrink-0 text-2xl text-center">
                    {page.icon}
                  </span>
                  <span className={`ml-2 overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                    {page.label}
                  </span>
                </button>
              ))}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <NeonButton onClick={onLogout} className={`w-full ${isSidebarExpanded ? '' : 'opacity-0 pointer-events-none'}`}>
            Logout
          </NeonButton>
        </div>
      </nav>

      {/* Bottom Navigation Bar - Visible on small screens, hidden on md and up */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#333] shadow-lg flex justify-around p-2 md:hidden z-40">
        {/* Home button - always visible */}
        <button
          onClick={() => setShowMobileHome(true)}
          className="flex-1 text-center text-lg py-4 px-2 rounded-br-2xl font-extrabold transition-all duration-200 text-[#FF3C00] hover:text-[#FF3C00] bg-[#181818] shadow-md"
        >
          <span style={{ fontSize: '2rem', display: 'block' }}>🏠</span>
          <span className="block text-base mt-1">Home</span>
        </button>
        {/* Back button - only visible when not in home view */}
        {!showMobileHome && (
          <button
            onClick={() => setShowMobileHome(true)}
            className="flex-1 text-center text-xs py-2 px-1 rounded-br-lg transition-all duration-200 text-[#D1D1D1] hover:text-[#FF3C00]"
          >
            ← Back
          </button>
        )}
      </nav>
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard'); // Changed default to 'dashboard'
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null); // NEW: store email
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setUserEmail(user.email || null); // NEW: store email if available
      } else {
        // Sign in anonymously if no user is authenticated
        try {
          const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
          setUserId(auth.currentUser.uid); // Set userId after successful sign-in
          setUserEmail(auth.currentUser.email || null); // NEW: set email (should be null for anon)
        } catch (error) {
          console.error("Error during anonymous sign-in:", error);
          // Handle sign-in error gracefully, maybe show a message to the user
        }
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleEnterDashboard = () => {
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    // In a real app, you'd implement Firebase logout here.
    // For this demo, we just go back to the homepage.
    setCurrentPage('home');
    setUserId(null); // Clear user ID on logout
  };

  // Ensure app always starts at dashboard page (menu)
  useEffect(() => {
    setCurrentPage('dashboard');
  }, []);

  if (!isAuthReady) {
    return (
      <DotGridBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-[#FF3C00] text-2xl animate-pulse">Loading...</div>
        </div>
      </DotGridBackground>
    );
  }

  return (
    <DotGridBackground>
      {currentPage === 'home' ? (
        <HomePage onEnterDashboard={handleEnterDashboard} />
      ) : (
        <Dashboard userId={userId} userEmail={userEmail} db={db} onLogout={handleLogout} />
      )}
    </DotGridBackground>
  );
};

export default App;
