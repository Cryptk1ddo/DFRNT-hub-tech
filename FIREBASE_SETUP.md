# Firebase Setup Guide for FocusForge 🔥

This guide will walk you through setting up Firebase for your FocusForge application.

## Step 1: Create a Firebase Project

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Sign in with your Google account

2. **Create a New Project**
   - Click "Add project"
   - Enter a project name: `focusforge-app` (or your preferred name)
   - Choose whether to enable Google Analytics (optional)
   - Click "Create project"

## Step 2: Add a Web App

1. **Register Your App**
   - In your Firebase project dashboard, click the web icon (`</>`)
   - Enter an app nickname: `FocusForge Web App`
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"

2. **Copy Configuration**
   - Firebase will show you a configuration object like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key-here",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456"
   };
   ```
   - **Keep this configuration safe** - you'll need it for the next step

## Step 3: Set Up Environment Variables

1. **Create .env File**
   ```bash
   cp env.example .env
   ```

2. **Fill in Your Firebase Configuration**
   Edit the `.env` file and replace the placeholder values with your actual Firebase config:
   ```
   REACT_APP_FIREBASE_API_KEY=your-api-key-here
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
   REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
   ```

## Step 4: Set Up Firestore Database

1. **Create Database**
   - In Firebase Console, go to "Firestore Database"
   - Click "Create database"
   - Choose "Start in test mode" (we'll add security rules later)
   - Select a location close to your users
   - Click "Done"

2. **Set Up Security Rules**
   - In Firestore Database, go to the "Rules" tab
   - Replace the default rules with:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /artifacts/{appId}/users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
   - Click "Publish"

## Step 5: Enable Authentication

1. **Set Up Authentication**
   - In Firebase Console, go to "Authentication"
   - Click "Get started"
   - Go to the "Sign-in method" tab
   - Enable "Anonymous" authentication (this is what the app uses)
   - Click "Save"

## Step 6: Test Your Setup

1. **Start the Development Server**
   ```bash
   npm start
   ```

2. **Test the App**
   - Open [http://localhost:3000](http://localhost:3000)
   - Try creating a task in the Pomodoro timer
   - Check if data appears in your Firestore database

## Troubleshooting

### Common Issues:

1. **"Firebase: Error (auth/unauthorized-domain)"**
   - Go to Firebase Console → Authentication → Settings → Authorized domains
   - Add `localhost` for development
   - Add `cryptk1ddo.github.io` for production

2. **"Firebase: Error (auth/operation-not-allowed)"**
   - Make sure Anonymous authentication is enabled in Firebase Console

3. **"Firebase: Error (permission-denied)"**
   - Check your Firestore security rules
   - Make sure they match the ones provided above

4. **Environment variables not working**
   - Make sure your `.env` file is in the root directory
   - Restart your development server after creating `.env`
   - Check that all variable names start with `REACT_APP_`

### Security Best Practices:

1. **Never commit your .env file**
   - The `.env` file is already in `.gitignore`
   - Keep your Firebase API keys private

2. **Use proper security rules**
   - The provided rules ensure users can only access their own data
   - Consider adding additional validation as needed

3. **Monitor usage**
   - Check Firebase Console regularly for usage and errors
   - Set up billing alerts if needed

## Next Steps

Once Firebase is set up:

1. **Deploy to GitHub Pages**
   ```bash
   ./deploy.sh
   ```

2. **Update Authorized Domains**
   - Add your GitHub Pages domain to Firebase Authentication
   - Go to Authentication → Settings → Authorized domains
   - Add: `cryptk1ddo.github.io`

3. **Monitor Your App**
   - Check Firebase Console for usage analytics
   - Monitor Firestore for data growth
   - Set up error reporting if needed

## Support

If you encounter issues:

1. Check the [Firebase Documentation](https://firebase.google.com/docs)
2. Review the [React Firebase Guide](https://firebase.google.com/docs/web/setup)
3. Check the app's console for error messages
4. Verify your environment variables are correct

---

**Your FocusForge app is now ready to use with Firebase! 🚀** 