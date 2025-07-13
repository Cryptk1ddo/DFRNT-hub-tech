# 🚀 FocusForge Quick Start Guide

Get your FocusForge app up and running in 5 minutes!

## Prerequisites
- Node.js (v14 or higher)
- A Google account (for Firebase)
- Git

## Step 1: Set Up Firebase (3 minutes)

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" → Name it `focusforge-app`
   - Skip Google Analytics for now

2. **Add Web App**
   - Click the web icon (`</>`) in your project
   - Register app as "FocusForge Web App"
   - Copy the config object (you'll need it in step 3)

3. **Set Up Database**
   - Go to "Firestore Database" → "Create database"
   - Start in test mode
   - Choose a location close to you

4. **Enable Authentication**
   - Go to "Authentication" → "Get started"
   - Enable "Anonymous" sign-in method

## Step 2: Configure Environment (1 minute)

1. **Create .env file**
   ```bash
   cp env.example .env
   ```

2. **Add your Firebase config**
   Edit `.env` and replace with your actual values:
   ```
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
   REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

## Step 3: Install & Test (1 minute)

```bash
npm install
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to test your app!

## Step 4: Deploy to GitHub (1 minute)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial FocusForge app"
   git remote add origin https://github.com/Cryptk1ddo/DFRNT-hub-tech.git
   git push -u origin main
   ```

2. **Deploy to GitHub Pages**
   ```bash
   ./deploy.sh
   ```

3. **Update Firebase Domains**
   - Go to Firebase Console → Authentication → Settings
   - Add `cryptk1ddo.github.io` to authorized domains

## 🎉 Done!

Your app is now live at: **https://cryptk1ddo.github.io/DFRNT-hub-tech**

## Features You Can Test

- ⏰ **Pomodoro Timer**: Set work intervals and manage tasks
- 🎧 **Binaural Beats**: Audio-based focus enhancement
- 📚 **Focus Guides**: Productivity techniques and tips
- 💊 **Nootropics**: Supplement stacks for cognitive enhancement
- 🧠 **Braverman Test**: Neurotransmitter profile assessment
- 🗂️ **Flashcards**: Spaced repetition learning system
- 🗓️ **Scheduler**: Time-boxing with calendar export
- 🎓 **Training Hub**: Cognitive enhancement guides

## Need Help?

- 📖 **Detailed Setup**: See [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- 📚 **Full Documentation**: See [README.md](README.md)
- 🐛 **Issues**: Check the troubleshooting section in FIREBASE_SETUP.md

---

**Happy focusing! 🚀** 