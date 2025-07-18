import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
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

// --- Home Page Redesign ---
const HomePage = ({ userId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();
  const appId = process.env.REACT_APP_FIREBASE_APP_ID || 'default-app-id';

  useEffect(() => {
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

  // Date helpers
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Separate tasks
  const todayTasks = tasks.filter(t => t.dueDate === todayStr && !t.completed);
  const tomorrowTasks = tasks.filter(t => t.dueDate === tomorrowStr && !t.completed);

  return (
    <div className="min-h-screen bg-[#111] flex flex-col pb-24">
      {/* Header */}
      <div className="px-6 pt-8 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-white">Hi, Anon <span className="inline-block">👋</span></h2>
          <button className="bg-[#232323] p-2 rounded-lg text-[#D1D1D1] text-xl">
            <span role="img" aria-label="calendar">📅</span>
          </button>
        </div>
        <div className="text-gray-400 text-lg mb-4">Agenda for today</div>
        <div className="text-4xl font-extrabold text-white mb-4">Today</div>
        {/* Today Tasks */}
        <div>
          {loading ? (
            <div className="text-gray-500 text-center py-8">Loading...</div>
          ) : todayTasks.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No tasks for today</div>
          ) : todayTasks.map(task => (
            <div key={task.id} className="bg-[#181818] rounded-xl p-4 mb-4 flex items-center shadow border border-[#232323]">
              <input type="checkbox" className="form-checkbox h-6 w-6 text-[#FF9100] bg-black border-[#FF9100] mr-4" checked={!!task.completed} readOnly />
              <div>
                <div className="font-bold text-lg text-white">{task.text}</div>
                <div className="text-gray-400 text-sm">Today / {task.project ? task.project : 'Unplaced'}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Upcoming */}
        <div className="text-2xl font-bold text-gray-200 mt-8 mb-2">Upcoming</div>
        <div className="text-lg font-semibold text-gray-400 mb-2">Tomorrow</div>
        {/* Tomorrow Tasks */}
        <div>
          {tomorrowTasks.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No tasks for tomorrow</div>
          ) : tomorrowTasks.map(task => (
            <div key={task.id} className="bg-[#181818] rounded-xl p-4 mb-4 flex items-center shadow border border-[#232323]">
              <input type="checkbox" className="form-checkbox h-6 w-6 text-[#FF9100] bg-black border-[#FF9100] mr-4" checked={!!task.completed} readOnly />
              <div>
                <div className="font-bold text-lg text-white">{task.text}</div>
                <div className="text-gray-400 text-sm">Today / {task.project ? task.project : 'Unplaced'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* FAB */}
      <button className="fixed bottom-24 right-6 bg-[#FF9100] text-white rounded-full w-16 h-16 flex items-center justify-center text-4xl shadow-lg z-50">
        +
      </button>
      {/* Bottom Navigation */}
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

// Minimal GoogleSignInScreen component for Google sign-in
const GoogleSignInScreen = ({ onSignIn }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#111] text-white">
    <h2 className="text-3xl font-bold mb-6">Sign in to FocusForge</h2>
    <button
      onClick={onSignIn}
      className="bg-[#FF3C00] text-white px-6 py-3 rounded-lg text-lg font-bold shadow-lg hover:bg-[#ff5e1a] transition"
    >
      Sign in with Google
    </button>
  </div>
);

// --- Main App Component ---
const App = () => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    const auth = getAuth();
    try {
      await signInWithPopup(auth, provider);
      // User will be set by onAuthStateChanged
    } catch (error) {
      alert('Google sign-in failed.');
    }
  };

  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#111] text-white text-2xl">Loading...</div>;
  }

  if (!user) {
    return <GoogleSignInScreen onSignIn={handleGoogleSignIn} />;
  }

  // Render HomePage as the main page
  return (
    <div className="relative">
      <button onClick={handleSignOut} className="absolute top-4 right-4 bg-[#222] text-white px-4 py-2 rounded-lg z-50">Sign Out</button>
      <HomePage userId={user.uid} />
    </div>
  );
};

export default App;