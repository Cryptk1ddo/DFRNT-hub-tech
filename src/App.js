import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, onSnapshot, deleteDoc, updateDoc, addDoc, orderBy, where, serverTimestamp, getDocs } from 'firebase/firestore';
import * as Tone from 'tone'; // Import Tone.js as a namespace
import PullToRefresh from 'react-simple-pull-to-refresh';
import { Box, Typography, IconButton, Checkbox, Fab, BottomNavigation, BottomNavigationAction, Paper, Collapse, Fade, TextField, InputAdornment } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';
import ListIcon from '@mui/icons-material/List';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BarChartIcon from '@mui/icons-material/BarChart';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

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
    className={`fixed bottom-20 right-4 mb-20 z-[101] bg-[#FF3C00] text-white rounded-full shadow-lg p-5 flex items-center justify-center text-3xl font-extrabold md:hidden transition-all duration-300 hover:scale-110 active:scale-95 ${className}`}
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
  const [showAddTaskInput, setShowAddTaskInput] = useState(false);
  const [showEditTaskInput, setShowEditTaskInput] = useState(false);
  const [showAddTaskInputRef, setShowAddTaskInputRef] = useState(null);
  const [showEditTaskInputRef, setShowEditTaskInputRef] = useState(null);

  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const addTaskInputRef = useRef(null);

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

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const addTask = async () => {
    triggerHaptic();
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
    triggerHaptic();
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
    triggerHaptic();
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

  useEffect(() => {
    if ((showAddTaskForm || editingTaskId !== null) && isMobile() && addTaskInputRef.current) {
      addTaskInputRef.current.focus();
      addTaskInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showAddTaskForm, editingTaskId]);

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
          ref={showAddTaskForm ? addTaskInputRef : null}
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
                  ref={showEditTaskInputRef}
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
                  onClick={() => { if (isMobile()) startEditingTask(task); }}
                >
                  {task.text}
                </span>
              )}
              <div className="flex items-center space-x-2 sm:ml-4 self-end sm:self-auto">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTaskCompletion(task.id, task.completed)}
                  className="form-checkbox h-7 w-7 sm:h-5 sm:w-5 text-[#FF3C00] bg-black border-gray-600 rounded focus:ring-[#FF3C00] touch-area"
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
              ref={addTaskInputRef}
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
        <PullToRefresh onRefresh={() => Promise.resolve()}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow overflow-y-auto pr-2">
            {guides.length === 0 && (
              <EmptyState
                icon="📖"
                message="No guides yet!"
                cta={isAdmin ? "Add your first guide" : undefined}
                onCta={isAdmin ? () => setShowAddGuideModal(true) : undefined}
              />
            )}
            {guides.map((guide, index) => (
              <Card key={index} className="p-4 bg-[#0F0F0F] border border-[#222] hover:border-[#FF3C00] transition-all duration-200 cursor-pointer">
                <button onClick={() => setSelectedGuide(guide)} className="w-full text-left focus:outline-none">
                  <h3 className="text-xl text-[#FF3C00] font-bold mb-2">{guide.title}</h3>
                  <p className="text-sm text-[#D1D1D1]">{guide.description}</p>
                </button>
              </Card>
            ))}
          </div>
        </PullToRefresh>
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

      <PullToRefresh onRefresh={() => Promise.resolve()}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow overflow-y-auto pr-2">
          {stacks.length === 0 && (
            <EmptyState
              icon="🧠"
              message="No stacks yet!"
              cta={isAdmin ? "Add your first stack" : undefined}
              onCta={isAdmin ? () => setShowAddStackModal(true) : undefined}
            />
          )}
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
      </PullToRefresh>
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
const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
};

const Flashcards = ({ userId, db }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const [showAddCardInput, setShowAddCardInput] = useState(false);
  const [showEditCardInput, setShowEditCardInput] = useState(false);
  const [showAddCardInputRef, setShowAddCardInputRef] = useState(null);
  const [showEditCardInputRef, setShowEditCardInputRef] = useState(null);

  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const addCardInputRef = useRef(null);

  const flashcardsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/flashcards`);

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

    const q = query(flashcardsCollectionRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedFlashcards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFlashcards(fetchedFlashcards);
    }, (error) => {
      console.error("Error fetching flashcards:", error);
      setModalContent({ title: 'Error', message: 'Failed to load flashcards. Please try again.' });
      setShowModal(true);
    });

    return () => unsubscribe();
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



  const addCard = async () => {
    triggerHaptic();
    if (newQuestion.trim() === '') {
      setModalContent({ title: 'Input Error', message: 'Question cannot be empty.' });
      setShowModal(true);
      return;
    }
    try {
      await addDoc(flashcardsCollectionRef, { question: newQuestion, answer: newAnswer, createdAt: new Date() });
      setNewQuestion('');
      setNewAnswer('');
    } catch (e) {
      console.error("Error adding document: ", e);
      setModalContent({ title: 'Error', message: 'Failed to add card. Please try again.' });
      setShowModal(true);
    }
  };

  const toggleCardCompletion = async (id, completed) => {
    triggerHaptic();
    try {
      const cardDocRef = doc(db, `artifacts/${appId}/users/${userId}/flashcards`, id);
      await updateDoc(cardDocRef, { 
        completed: !completed,
        completedAt: !completed ? new Date() : null
      });
      
      // Play sound when card is completed
      if (!completed) {
        playSound('task');
      }
    } catch (e) {
      console.error("Error updating document: ", e);
      setModalContent({ title: 'Error', message: 'Failed to update card. Please try again.' });
      setShowModal(true);
    }
  };

  const deleteCard = (id) => {
    triggerHaptic();
    setModalContent({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this card?'
    });
    setModalConfirmAction(() => async () => {
      try {
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/flashcards`, id));
        setShowConfirmModal(false);
      } catch (e) {
        console.error("Error deleting document: ", e);
        setModalContent({ title: 'Error', message: 'Failed to delete card. Please try again.' });
        setShowModal(true);
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const startEditingCard = (card) => {
    setEditingCardId(card.id);
    setEditingQuestion(card.question);
    setEditingAnswer(card.answer);
  };

  const saveEditedCard = async (id) => {
    if (editingQuestion.trim() === '') {
      setModalContent({ title: 'Input Error', message: 'Question cannot be empty.' });
      setShowModal(true);
      return;
    }
    try {
      const cardDocRef = doc(db, `artifacts/${appId}/users/${userId}/flashcards`, id);
      await updateDoc(cardDocRef, { question: editingQuestion, answer: editingAnswer });
      setEditingCardId(null);
      setEditingQuestion('');
      setEditingAnswer('');
    } catch (e) {
      console.error("Error saving edited card: ", e);
      setModalContent({ title: 'Error', message: 'Failed to save card. Please try again.' });
      setShowModal(true);
    }
  };

  const cancelEditingCard = () => {
    setEditingCardId(null);
    setEditingQuestion('');
    setEditingAnswer('');
  };

  useEffect(() => {
    if ((showAddCardForm || editingCardId !== null) && isMobile() && addCardInputRef.current) {
      addCardInputRef.current.focus();
      addCardInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showAddCardForm, editingCardId]);

  const windowWidth = useWindowWidth();
  const addCardQuestionRef = useRef(null);
  const addCardAnswerRef = useRef(null);

  return (
    <Card className="w-full h-full flex flex-col p-4 md:p-6">
      <h2 className="text-3xl text-[#FF3C00] font-bold mb-6 uppercase">Flashcards</h2>
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
      <h3 className="text-2xl text-[#FF3C00] font-bold mb-4 uppercase">Flashcards</h3>
      <div className="flex flex-col sm:flex-row mb-4">
        <input
          ref={showAddCardForm ? addCardInputRef : null}
          type="text"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Add a new question..."
          className="flex-grow bg-[#0F0F0F] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-xl focus:outline-none focus:border-[#FF3C00] mb-2 sm:mb-0"
        />
        <input
          ref={showAddCardForm ? addCardInputRef : null}
          type="text"
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          placeholder="Add an answer..."
          className="flex-grow bg-[#0F0F0F] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-xl focus:outline-none focus:border-[#FF3C00] mb-2 sm:mb-0"
        />
        <NeonButton onClick={addCard} className="sm:ml-2">Add Card</NeonButton>
      </div>

      <div className="mb-2">
        <p className="text-xs text-gray-500 text-center">💡 Swipe right to complete, left to delete</p>
      </div>
      <ul className="flex-grow overflow-y-auto pr-2">
        {flashcards.length === 0 && (
          <EmptyState
            icon="💡"
            message="No flashcards yet!"
            cta="Add your first flashcard"
            onCta={() => setShowAddCardForm(true)}
          />
        )}
        {flashcards.map((card) => (
          <SwipeableItem
            key={card.id}
            onSwipeLeft={() => deleteCard(card.id)}
            onSwipeRight={() => toggleCardCompletion(card.id, card.completed)}
            leftAction="Delete"
            rightAction={card.completed ? "Undo" : "Complete"}
            leftColor="bg-red-500"
            rightColor={card.completed ? "bg-yellow-500" : "bg-green-500"}
            className="mb-2"
          >
            <li className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0F0F0F] p-3 rounded-br-lg border border-[#222] hover:bg-[#151515] transition-colors duration-200">
              {editingCardId === card.id ? (
                <>
                  <input
                    ref={showAddCardInputRef}
                    type="text"
                    value={editingQuestion}
                    onChange={(e) => setEditingQuestion(e.target.value)}
                    placeholder="Enter question..."
                    className="w-full bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-md focus:outline-none focus:border-[#FF3C00]"
                  />
                  <input
                    ref={showAddCardInputRef}
                    type="text"
                    value={editingAnswer}
                    onChange={(e) => setEditingAnswer(e.target.value)}
                    placeholder="Enter answer..."
                    className="w-full bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-md focus:outline-none focus:border-[#FF3C00]"
                  />
                  <div className="flex justify-between mt-4">
                    <NeonButton onClick={() => saveEditedCard(card.id)} className="w-1/2">Save</NeonButton>
                    <NeonButton onClick={cancelEditingCard} className="w-1/2">Cancel</NeonButton>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-grow">
                    <strong>{card.question}</strong>
                    <p>{card.answer}</p>
                  </div>
                  <div className="flex items-center space-x-2 sm:ml-4 self-end sm:self-auto">
                    <input
                      type="checkbox"
                      checked={card.completed}
                      onChange={() => toggleCardCompletion(card.id, card.completed)}
                      className="form-checkbox h-7 w-7 sm:h-5 sm:w-5 text-[#FF3C00] bg-black border-gray-600 rounded focus:ring-[#FF3C00] touch-area"
                    />
                    {editingCardId !== card.id && (
                      <>
                        <button
                          onClick={() => startEditingCard(card)}
                          className="text-gray-400 hover:text-[#FF3C00] transition-colors duration-200 p-1"
                          title="Edit Card"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.829z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteCard(card.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1"
                          title="Delete Card"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
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
      {/* Add Card Form */}
      {(showAddCardForm || windowWidth >= 768) && (
        <Card className="mb-8 p-4 bg-[#0F0F0F] border border-[#222]">
          <h4 className="text-xl text-[#FF3C00] font-bold mb-4">Add New Card</h4>
          <div className="space-y-4">
            <input
              ref={addCardQuestionRef}
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter question..."
              className="w-full bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-md focus:outline-none focus:border-[#FF3C00]"
            />
            <input
              ref={addCardAnswerRef}
              type="text"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Enter answer..."
              className="w-full bg-[#1a1a1a] border border-[#333] text-[#D1D1D1] p-3 rounded-bl-md focus:outline-none focus:border-[#FF3C00]"
            />
            <NeonButton onClick={addCard} className="w-full">Add Card</NeonButton>
            {windowWidth < 768 && (
              <button onClick={() => setShowAddCardForm(false)} className="mt-2 text-gray-400 hover:text-red-500">Cancel</button>
            )}
          </div>
        </Card>
      )}
      {/* FAB for Add Card (mobile only) */}
      {windowWidth < 768 && (
        <FAB onClick={() => setShowAddCardForm(true)} label="Add Card" icon="+" />
      )}
    </Card>
  );
};

// --- Time Boxing Scheduler Component (Remade for Mobile Design) ---
const TimeBoxingScheduler = ({ userId, db }) => {
  const [events, setEvents] = useState([]);
  const [showAddEventForm, setShowAddEventForm] = useState(false);

  // Fetch events from Firestore
  useEffect(() => {
    if (!userId) return;
    const scheduledEventsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/scheduledEvents`);
    const q = query(scheduledEventsCollectionRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date, // 'YYYY-MM-DD'
      }));
      setEvents(fetchedEvents);
    });
    return () => unsubscribe();
  }, [userId, db]);

  // Group events by date
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const todayEvents = events.filter(ev => ev.date === todayStr);
  const tomorrowEvents = events.filter(ev => ev.date === tomorrowStr);
  const upcomingEvents = events.filter(ev => ev.date !== todayStr && ev.date !== tomorrowStr);

  return (
    <div className="min-h-screen bg-[#181818] text-[#D1D1D1] flex flex-col pb-24">
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Hi, Anon <span className="inline-block">👋</span></h2>
          <button className="bg-[#232323] p-2 rounded-lg text-[#D1D1D1] text-xl">
            <span role="img" aria-label="calendar">📅</span>
          </button>
        </div>
        <div className="text-gray-400 text-lg mb-4">Agenda for today</div>
        <div className="text-4xl font-extrabold text-white mb-4">Today</div>
        {/* Today Events */}
        <div>
          {todayEvents.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No tasks for today</div>
          ) : (
            todayEvents.map(ev => (
              <div key={ev.id} className="bg-[#111] rounded-xl p-4 mb-4 flex items-center shadow border border-[#232323]">
                <input type="checkbox" className="form-checkbox h-6 w-6 text-[#FF9100] bg-black border-[#FF9100] mr-4" />
                <div>
                  <div className="font-bold text-lg text-white">{ev.title || ev.name || 'Untitled Task'}</div>
                  <div className="text-gray-400 text-sm">Today / Unplaced</div>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Upcoming */}
        <div className="text-2xl font-bold text-gray-200 mt-8 mb-2">Upcoming</div>
        <div className="text-lg font-semibold text-gray-400 mb-2">Tomorrow</div>
        {/* Tomorrow Events */}
        <div>
          {tomorrowEvents.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No tasks for tomorrow</div>
          ) : (
            tomorrowEvents.map(ev => (
              <div key={ev.id} className="bg-[#111] rounded-xl p-4 mb-4 flex items-center shadow border border-[#232323]">
                <input type="checkbox" className="form-checkbox h-6 w-6 text-[#FF9100] bg-black border-[#FF9100] mr-4" />
                <div>
                  <div className="font-bold text-lg text-white">{ev.title || ev.name || 'Untitled Task'}</div>
                  <div className="text-gray-400 text-sm">Today / Unplaced</div>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Other Upcoming Events (optional) */}
        {upcomingEvents.length > 0 && (
          <div className="mt-4">
            {upcomingEvents.map(ev => (
              <div key={ev.id} className="bg-[#111] rounded-xl p-4 mb-4 flex items-center shadow border border-[#232323]">
                <input type="checkbox" className="form-checkbox h-6 w-6 text-[#FF9100] bg-black border-[#FF9100] mr-4" />
                <div>
                  <div className="font-bold text-lg text-white">{ev.title || ev.name || 'Untitled Task'}</div>
                  <div className="text-gray-400 text-sm">{ev.date} / Unplaced</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* FAB */}
      <button className="fixed bottom-24 right-6 bg-[#FF9100] text-white rounded-full w-16 h-16 flex items-center justify-center text-4xl shadow-lg z-50">
        +
      </button>
      {/* Sticky Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#181818] border-t border-[#232323] flex justify-around items-center h-20 z-40">
        <button className="flex flex-col items-center text-[#FF9100]">
          <span className="text-2xl">▤</span>
          <span className="text-xs mt-1">Agenda</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">⚡</span>
          <span className="text-xs mt-1">Focus</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">📝</span>
          <span className="text-xs mt-1">Notes</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">📊</span>
          <span className="text-xs mt-1">Stats</span>
        </button>
      </nav>
    </div>
  );
};

// --- Redesigned Scheduler Page ---
const SchedulerPage = () => {
  // Firebase setup
  const db = getFirestore();
  const auth = getAuth();
  const appId = process.env.REACT_APP_FIREBASE_APP_ID || 'default-app-id';
  const [userId, setUserId] = React.useState(null);
  const [tasks, setTasks] = React.useState([]);
  const [newTask, setNewTask] = React.useState('');
  const [newDueDate, setNewDueDate] = React.useState(new Date());
  const [loading, setLoading] = React.useState(true);
  const [navValue, setNavValue] = React.useState(0);
  const [editingId, setEditingId] = React.useState(null);
  const [editingText, setEditingText] = React.useState('');
  const [editingDueDate, setEditingDueDate] = React.useState(new Date());
  const inputRef = React.useRef();

  // Auth state
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsubscribe();
  }, [auth]);

  // Fetch tasks
  React.useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const tasksCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tasks`);
    const q = query(tasksCollectionRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(fetchedTasks);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId, db, appId]);

  // Add task
  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    const tasksCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tasks`);
    await addDoc(tasksCollectionRef, {
      text: newTask,
      completed: false,
      createdAt: new Date(),
      dueDate: newDueDate.toISOString().slice(0, 10),
    });
    setNewTask('');
    setNewDueDate(new Date());
    if (inputRef.current) inputRef.current.blur();
  };

  // Toggle complete
  const handleToggleComplete = async (task) => {
    const taskDocRef = doc(db, `artifacts/${appId}/users/${userId}/tasks`, task.id);
    await updateDoc(taskDocRef, { completed: !task.completed });
  };

  // Delete task
  const handleDeleteTask = async (task) => {
    const taskDocRef = doc(db, `artifacts/${appId}/users/${userId}/tasks`, task.id);
    await deleteDoc(taskDocRef);
  };

  // Start editing
  const handleStartEdit = (task) => {
    setEditingId(task.id);
    setEditingText(task.text);
    setEditingDueDate(task.dueDate ? new Date(task.dueDate) : new Date());
  };

  // Save edit
  const handleSaveEdit = async (task) => {
    const taskDocRef = doc(db, `artifacts/${appId}/users/${userId}/tasks`, task.id);
    await updateDoc(taskDocRef, {
      text: editingText,
      dueDate: editingDueDate.toISOString().slice(0, 10),
    });
    setEditingId(null);
    setEditingText('');
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  // Date helpers
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Separate tasks
  const todayTasks = tasks.filter(t => t.dueDate === todayStr && !t.completed);
  const tomorrowTasks = tasks.filter(t => t.dueDate === tomorrowStr && !t.completed);
  const upcomingTasks = tasks.filter(t => t.dueDate > tomorrowStr && !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ minHeight: '100vh', bgcolor: '#111', color: '#fff', pb: 9 }}>
        {/* Header */}
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: 4, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center' }}>
                Hi, Anon <span role="img" aria-label="wave" style={{ marginLeft: 8, fontSize: 28 }}>👋</span>
              </Typography>
              <Typography variant="body1" sx={{ color: '#aaa', mt: 0.5 }}>
                Agenda for today
              </Typography>
            </Box>
            <IconButton sx={{ color: '#fff', bgcolor: '#232323', borderRadius: 2 }}>
              <CalendarMonthIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Add Task Input */}
        <Box sx={{ px: { xs: 2, sm: 3 }, mt: 2, display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box sx={{ flex: 2 }}>
            <TextField
              inputRef={inputRef}
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); }}
              placeholder="Add a new task..."
              variant="outlined"
              size="small"
              fullWidth
              sx={{ bgcolor: '#181818', borderRadius: 1, input: { color: '#fff' } }}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 140 }}>
            <DatePicker
              value={newDueDate}
              onChange={setNewDueDate}
              slotProps={{ textField: { size: 'small', sx: { bgcolor: '#181818', borderRadius: 1, input: { color: '#fff' } } } }}
              format="yyyy-MM-dd"
            />
          </Box>
          <Fab
            color="warning"
            aria-label="add"
            sx={{ minWidth: 0, width: 48, height: 48, bgcolor: '#FF8000', color: '#fff', '&:hover': { bgcolor: '#FF8000' }, boxShadow: 'none', alignSelf: 'center' }}
            onClick={handleAddTask}
          >
            <AddIcon />
          </Fab>
        </Box>

        {/* Today Section */}
        <Box sx={{ px: { xs: 2, sm: 3 }, mt: 3 }}>
          <Typography variant="h3" fontWeight={900} sx={{ mb: 2, color: '#fff', fontSize: 38 }}>
            Today
          </Typography>
          <Box sx={{ bgcolor: '#181818', borderRadius: 2, p: 2, mb: 3, minHeight: 80 }}>
            {loading ? (
              <Typography sx={{ color: '#aaa' }}>Loading...</Typography>
            ) : todayTasks.length === 0 ? (
              <Typography sx={{ color: '#aaa' }}>No tasks for today.</Typography>
            ) : todayTasks.map(task => (
              <Collapse key={task.id} in={true} timeout={400}>
                <Fade in={true} timeout={400}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, pr: 1 }}>
                    <Checkbox
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task)}
                      sx={{
                        color: '#FF8000',
                        '&.Mui-checked': { color: '#FF8000' },
                        mr: 1.5,
                        borderRadius: 1,
                        border: '2px solid #FF8000',
                        p: 0.5
                      }}
                    />
                    {editingId === task.id ? (
                      <>
                        <TextField
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          size="small"
                          sx={{ bgcolor: '#232323', borderRadius: 1, input: { color: '#fff', fontWeight: 700, fontSize: 18 } }}
                        />
                        <DatePicker
                          value={editingDueDate}
                          onChange={setEditingDueDate}
                          slotProps={{ textField: { size: 'small', sx: { bgcolor: '#232323', borderRadius: 1, input: { color: '#fff' } } } }}
                          format="yyyy-MM-dd"
                        />
                        <IconButton onClick={() => handleSaveEdit(task)} sx={{ color: '#FF8000', ml: 1 }}><SaveIcon /></IconButton>
                        <IconButton onClick={handleCancelEdit} sx={{ color: '#aaa', ml: 0.5 }}><CloseIcon /></IconButton>
                      </>
                    ) : (
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <Typography fontWeight={700} sx={{ color: '#fff', fontSize: 18, flex: 1 }}>
                          {task.text}
                        </Typography>
                        <Typography sx={{ color: '#aaa', fontSize: 13, ml: 2 }}>
                          {task.dueDate}
                        </Typography>
                        <IconButton onClick={() => handleStartEdit(task)} sx={{ color: '#aaa', ml: 1 }}><EditIcon /></IconButton>
                        <IconButton onClick={() => handleDeleteTask(task)} sx={{ color: '#FF8000', ml: 1 }}>
                          <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path fill="currentColor" fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Fade>
              </Collapse>
            ))}
          </Box>
        </Box>

        {/* Tomorrow Section */}
        <Box sx={{ px: { xs: 2, sm: 3 }, mt: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#ccc', mb: 0.5 }}>
            Tomorrow
          </Typography>
          <Box sx={{ bgcolor: '#181818', borderRadius: 2, p: 2 }}>
            {tomorrowTasks.length === 0 ? (
              <Typography sx={{ color: '#aaa' }}>No tasks for tomorrow.</Typography>
            ) : tomorrowTasks.map(task => (
              <Collapse key={task.id} in={true} timeout={400}>
                <Fade in={true} timeout={400}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, pr: 1 }}>
                    <Checkbox
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task)}
                      sx={{
                        color: '#FF8000',
                        '&.Mui-checked': { color: '#FF8000' },
                        mr: 1.5,
                        borderRadius: 1,
                        border: '2px solid #FF8000',
                        p: 0.5
                      }}
                    />
                    {editingId === task.id ? (
                      <>
                        <TextField
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          size="small"
                          sx={{ bgcolor: '#232323', borderRadius: 1, input: { color: '#fff', fontWeight: 700, fontSize: 18 } }}
                        />
                        <DatePicker
                          value={editingDueDate}
                          onChange={setEditingDueDate}
                          slotProps={{ textField: { size: 'small', sx: { bgcolor: '#232323', borderRadius: 1, input: { color: '#fff' } } } }}
                          format="yyyy-MM-dd"
                        />
                        <IconButton onClick={() => handleSaveEdit(task)} sx={{ color: '#FF8000', ml: 1 }}><SaveIcon /></IconButton>
                        <IconButton onClick={handleCancelEdit} sx={{ color: '#aaa', ml: 0.5 }}><CloseIcon /></IconButton>
                      </>
                    ) : (
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <Typography fontWeight={700} sx={{ color: '#fff', fontSize: 18, flex: 1 }}>
                          {task.text}
                        </Typography>
                        <Typography sx={{ color: '#aaa', fontSize: 13, ml: 2 }}>
                          {task.dueDate}
                        </Typography>
                        <IconButton onClick={() => handleStartEdit(task)} sx={{ color: '#aaa', ml: 1 }}><EditIcon /></IconButton>
                        <IconButton onClick={() => handleDeleteTask(task)} sx={{ color: '#FF8000', ml: 1 }}>
                          <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path fill="currentColor" fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Fade>
              </Collapse>
            ))}
          </Box>
        </Box>

        {/* Upcoming Section */}
        <Box sx={{ px: { xs: 2, sm: 3 }, mt: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#ccc', mb: 0.5 }}>
            Upcoming
          </Typography>
          <Box sx={{ bgcolor: '#181818', borderRadius: 2, p: 2 }}>
            {upcomingTasks.length === 0 ? (
              <Typography sx={{ color: '#aaa' }}>No upcoming tasks.</Typography>
            ) : upcomingTasks.map(task => (
              <Collapse key={task.id} in={true} timeout={400}>
                <Fade in={true} timeout={400}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, pr: 1 }}>
                    <Checkbox
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task)}
                      sx={{
                        color: '#FF8000',
                        '&.Mui-checked': { color: '#FF8000' },
                        mr: 1.5,
                        borderRadius: 1,
                        border: '2px solid #FF8000',
                        p: 0.5
                      }}
                    />
                    {editingId === task.id ? (
                      <>
                        <TextField
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          size="small"
                          sx={{ bgcolor: '#232323', borderRadius: 1, input: { color: '#fff', fontWeight: 700, fontSize: 18 } }}
                        />
                        <DatePicker
                          value={editingDueDate}
                          onChange={setEditingDueDate}
                          slotProps={{ textField: { size: 'small', sx: { bgcolor: '#232323', borderRadius: 1, input: { color: '#fff' } } } }}
                          format="yyyy-MM-dd"
                        />
                        <IconButton onClick={() => handleSaveEdit(task)} sx={{ color: '#FF8000', ml: 1 }}><SaveIcon /></IconButton>
                        <IconButton onClick={handleCancelEdit} sx={{ color: '#aaa', ml: 0.5 }}><CloseIcon /></IconButton>
                      </>
                    ) : (
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <Typography fontWeight={700} sx={{ color: '#fff', fontSize: 18, flex: 1 }}>
                          {task.text}
                        </Typography>
                        <Typography sx={{ color: '#aaa', fontSize: 13, ml: 2 }}>
                          {task.dueDate}
                        </Typography>
                        <IconButton onClick={() => handleStartEdit(task)} sx={{ color: '#aaa', ml: 1 }}><EditIcon /></IconButton>
                        <IconButton onClick={() => handleDeleteTask(task)} sx={{ color: '#FF8000', ml: 1 }}>
                          <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path fill="currentColor" fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Fade>
              </Collapse>
            ))}
          </Box>
        </Box>

        {/* Completed Section */}
        <Box sx={{ px: { xs: 2, sm: 3 }, mt: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#ccc', mb: 0.5 }}>
            Completed
          </Typography>
          <Box sx={{ bgcolor: '#181818', borderRadius: 2, p: 2 }}>
            {completedTasks.length === 0 ? (
              <Typography sx={{ color: '#aaa' }}>No completed tasks yet.</Typography>
            ) : completedTasks.map(task => (
              <Collapse key={task.id} in={true} timeout={400}>
                <Fade in={true} timeout={400}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, pr: 1, opacity: 0.6 }}>
                    <Checkbox
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task)}
                      sx={{
                        color: '#FF8000',
                        '&.Mui-checked': { color: '#FF8000' },
                        mr: 1.5,
                        borderRadius: 1,
                        border: '2px solid #FF8000',
                        p: 0.5
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={700} sx={{ color: '#fff', fontSize: 18, textDecoration: 'line-through' }}>
                        {task.text}
                      </Typography>
                      <Typography sx={{ color: '#aaa', fontSize: 13 }}>
                        {task.dueDate}
                      </Typography>
                    </Box>
                    <IconButton onClick={() => handleDeleteTask(task)} sx={{ color: '#FF8000', ml: 1 }}>
                      <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path fill="currentColor" fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                    </IconButton>
                  </Box>
                </Fade>
              </Collapse>
            ))}
          </Box>
        </Box>

        {/* Bottom Navigation */}
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: '#181818', borderTop: '1px solid #222', zIndex: 1200 }} elevation={3}>
          <BottomNavigation
            showLabels={false}
            value={navValue}
            onChange={(e, newValue) => setNavValue(newValue)}
            sx={{ bgcolor: '#181818' }}
          >
            <BottomNavigationAction icon={<ListIcon />} sx={{ color: navValue === 0 ? '#FF8000' : '#aaa' }} />
            <BottomNavigationAction icon={<FlashOnIcon />} sx={{ color: navValue === 1 ? '#FF8000' : '#aaa' }} />
            <BottomNavigationAction icon={<AssignmentIcon />} sx={{ color: navValue === 2 ? '#FF8000' : '#aaa' }} />
            <BottomNavigationAction icon={<BarChartIcon />} sx={{ color: navValue === 3 ? '#FF8000' : '#aaa' }} />
          </BottomNavigation>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

// --- Unified Act Page (Pomodoro + Binaural Beats) ---
const ActPage = () => {
  // Pomodoro state
  const [duration, setDuration] = useState(25); // in minutes
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  // Binaural state
  const [selectedPreset, setSelectedPreset] = useState('brown');
  // Timer scroller state
  const minMinutes = 20;
  const maxMinutes = 120;
  const radius = 110;
  const center = 130;
  const [dragging, setDragging] = useState(false);
  // Modal state
  const [showModal, setShowModal] = useState(false);
  // Binaural audio state
  const [audioNodes, setAudioNodes] = useState({});
  // For animated audio icon
  const [audioAnim, setAudioAnim] = useState(false);

  // --- Binaural Preset Configs ---
  const presetConfigs = {
    brown: { base: 220, beat: 2, bg: 'brown' },
    '8hz': { base: 220, beat: 8, bg: 'brown' },
    '32hz': { base: 220, beat: 32, bg: 'brown' },
    nap: { base: 180, beat: 4, bg: 'nature' },
  };

  // --- Binaural Audio Logic ---
  const startBinaural = async () => {
    const { base, beat, bg } = presetConfigs[selectedPreset];
    await Tone.start(); // resume context on gesture
    // Clean up any previous
    stopBinaural();
    // Main binaural beats
    const gain = new Tone.Gain(0).toDestination();
    const oL = new Tone.Oscillator(base, 'sine').connect(gain);
    const oR = new Tone.Oscillator(base + beat, 'sine').connect(gain);
    oL.volume.value = -10;
    oR.volume.value = -10;
    oL.start();
    oR.start();
    gain.gain.linearRampTo(0.3, 1.2);
    // Background
    let bgNode = null, bgGain = null;
    if (bg === 'nature') {
      bgGain = new Tone.Gain(0.2).toDestination();
      bgNode = new Tone.Player({ url: 'https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae5b2.mp3', loop: true, autostart: true }).connect(bgGain);
    } else if (bg === 'brown') {
      bgGain = new Tone.Gain(0.2).toDestination();
      bgNode = new Tone.Noise('brown').connect(bgGain);
      bgNode.start();
    }
    setAudioNodes({ oL, oR, gain, bgNode, bgGain });
  };
  const stopBinaural = () => {
    const { oL, oR, gain, bgNode, bgGain } = audioNodes;
    if (oL) oL.dispose();
    if (oR) oR.dispose();
    if (gain) gain.dispose();
    if (bgNode) bgNode.dispose();
    if (bgGain) bgGain.dispose();
    setAudioNodes({});
  };
  // Start/stop audio with timer
  useEffect(() => {
    if (isActive && !isPaused) {
      startBinaural();
    } else {
      stopBinaural();
    }
    // Clean up on unmount
    return () => stopBinaural();
    // eslint-disable-next-line
  }, [isActive, isPaused, selectedPreset]);

  // Haptic feedback helper
  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(30);
  };

  // Convert angle to minutes
  const angleToMinutes = (angle) => {
    const percent = angle / 270; // 270deg sweep
    return Math.round(minMinutes + percent * (maxMinutes - minMinutes));
  };
  // Convert minutes to angle
  const minutesToAngle = (min) => {
    return ((min - minMinutes) / (maxMinutes - minMinutes)) * 270;
  };

  // Handle drag on SVG knob
  const handlePointerDown = (e) => {
    setDragging(true);
    handlePointerMove(e);
  };
  const handlePointerMove = (e) => {
    if (!dragging) return;
    const svg = document.getElementById('timer-svg');
    const rect = svg.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left - center;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top - center;
    let angle = Math.atan2(y, x) * 180 / Math.PI + 135; // 135deg offset
    if (angle < 0) angle += 360;
    if (angle > 270) angle = 270;
    if (angle < 0) angle = 0;
    const newMin = angleToMinutes(angle);
    if (newMin !== duration) triggerHaptic();
    setDuration(newMin);
    setSecondsLeft(newMin * 60);
  };
  const handlePointerUp = () => setDragging(false);

  // Attach global listeners for drag
  useEffect(() => {
    if (!dragging) return;
    const move = (e) => handlePointerMove(e);
    const up = () => setDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, [dragging]);

  // Timer countdown effect
  useEffect(() => {
    if (!isActive || isPaused) return;
    if (secondsLeft <= 0) {
      setIsActive(false);
      setShowModal(true);
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, isPaused, secondsLeft]);

  // Sync secondsLeft with duration when not active
  useEffect(() => {
    if (!isActive && !dragging) {
      setSecondsLeft(duration * 60);
    }
  }, [duration, isActive, dragging]);

  // Draw arc for timer
  const angle = minutesToAngle(duration);
  const arcX = center + radius * Math.cos((angle - 135) * Math.PI / 180);
  const arcY = center + radius * Math.sin((angle - 135) * Math.PI / 180);
  const largeArc = angle > 180 ? 1 : 0;
  const arcPath = `M ${center + radius * Math.cos(-135 * Math.PI / 180)} ${center + radius * Math.sin(-135 * Math.PI / 180)} A ${radius} ${radius} 0 ${largeArc} 1 ${arcX} ${arcY}`;

  // Preset buttons
  const presets = [
    { key: 'brown', label: 'Brown' },
    { key: '8hz', label: '8hz' },
    { key: '32hz', label: '32hz' },
    { key: 'nap', label: 'Nap' },
  ];

  // Timer controls
  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };
  const handlePause = () => setIsPaused((p) => !p);
  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setSecondsLeft(duration * 60);
  };

  // Format time
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeDisplay = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Animate audio icon when playing
  useEffect(() => {
    if (isActive && !isPaused) {
      setAudioAnim(true);
    } else {
      setAudioAnim(false);
    }
  }, [isActive, isPaused]);

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-start pt-8 px-2 sm:px-4">
      <div className="w-full max-w-xs mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-white">Rock, Anon <span className="inline-block">🔥</span></h2>
          <button className="text-gray-400 text-xl"><span role="img" aria-label="settings">⚙️</span></button>
        </div>
        <div className="text-gray-400 mb-4">Locked In</div>
        {/* Task selector placeholder */}
        <select className="w-full bg-[#181818] text-[#aaa] p-3 rounded-lg mb-4">
          <option>Select Task</option>
        </select>
        {/* Preset buttons */}
        <div className="flex justify-between mb-6">
          {presets.map(p => (
            <button
              key={p.key}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors duration-200 ${selectedPreset === p.key ? 'bg-[#FF9100] text-white' : 'bg-[#181818] text-[#aaa]'}`}
              onClick={() => { setSelectedPreset(p.key); triggerHaptic(); }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {/* Animated Timer Scroller */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <svg
              id="timer-svg"
              width={260}
              height={260}
              viewBox="0 0 260 260"
              className="mb-2"
              onMouseDown={isActive ? undefined : handlePointerDown}
              onTouchStart={isActive ? undefined : handlePointerDown}
              onMouseUp={isActive ? undefined : handlePointerUp}
              onTouchEnd={isActive ? undefined : handlePointerUp}
              style={{ touchAction: 'none', userSelect: 'none', opacity: isActive ? 0.7 : 1, transition: 'opacity 0.2s' }}
            >
              {/* Track */}
              <circle cx={center} cy={center} r={radius} fill="none" stroke="#222" strokeWidth={16} />
              {/* Arc */}
              <path d={arcPath} fill="none" stroke="#FF9100" strokeWidth={16} strokeLinecap="round" />
              {/* Knob */}
              <circle cx={arcX} cy={arcY} r={18} fill="#FF9100" stroke="#fff" strokeWidth={4} />
            </svg>
            {/* Animated Audio Icon */}
            <div className="absolute left-1/2 top-1/2" style={{ transform: 'translate(-50%, -60%)' }}>
              <span className="block" aria-label="audio waves">
                <svg width="44" height="44" viewBox="0 0 44 44">
                  <g>
                    <rect x="8" y="18" width="4" height="8" rx="2" fill={audioAnim ? '#FF9100' : '#333'} style={{ opacity: audioAnim ? 1 : 0.5, transform: audioAnim ? 'scaleY(1.3)' : 'scaleY(1)', transition: 'all 0.4s' }} />
                    <rect x="16" y="14" width="4" height="16" rx="2" fill={audioAnim ? '#FF9100' : '#333'} style={{ opacity: audioAnim ? 0.8 : 0.5, transform: audioAnim ? 'scaleY(1.1)' : 'scaleY(1)', transition: 'all 0.4s 0.1s' }} />
                    <rect x="24" y="10" width="4" height="24" rx="2" fill={audioAnim ? '#FF9100' : '#333'} style={{ opacity: audioAnim ? 0.6 : 0.5, transform: audioAnim ? 'scaleY(1.2)' : 'scaleY(1)', transition: 'all 0.4s 0.2s' }} />
                    <rect x="32" y="14" width="4" height="16" rx="2" fill={audioAnim ? '#FF9100' : '#333'} style={{ opacity: audioAnim ? 0.8 : 0.5, transform: audioAnim ? 'scaleY(1.1)' : 'scaleY(1)', transition: 'all 0.4s 0.1s' }} />
                  </g>
                </svg>
              </span>
            </div>
          </div>
          <div className="text-white text-6xl font-extrabold mb-2" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px', transition: 'color 0.2s', color: isActive ? '#FF9100' : '#fff' }}>{timeDisplay}</div>
        </div>
        {/* Timer Controls */}
        <div className="flex justify-between mb-4">
          {!isActive ? (
            <button className="w-full bg-[#FF9100] text-white text-xl font-bold py-4 rounded-xl shadow-lg transition-all duration-200" onClick={handleStart}>Start Focus</button>
          ) : (
            <>
              <button className="flex-1 bg-[#FF9100] text-white text-lg font-bold py-3 rounded-xl shadow-lg mr-2 transition-all duration-200" onClick={handlePause}>{isPaused ? 'Resume' : 'Pause'}</button>
              <button className="flex-1 bg-[#222] text-white text-lg font-bold py-3 rounded-xl shadow-lg ml-2 transition-all duration-200" onClick={handleReset}>Reset</button>
            </>
          )}
        </div>
        {/* Timer Complete Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center max-w-xs w-full">
              <h3 className="text-2xl font-bold text-[#FF9100] mb-4">Time's Up!</h3>
              <p className="text-white mb-6">Your focus session is complete.</p>
              <button className="w-full bg-[#FF9100] text-white text-lg font-bold py-3 rounded-xl shadow-lg" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  return <ActPage />;
};

export default App;