# FocusForge 🚀

A comprehensive productivity and focus application built with React, featuring Pomodoro timer, binaural beats, flashcards, and more.

## ✨ Features

- **Pomodoro Timer**: Customizable work intervals with task management
- **Binaural Beats**: Audio-based focus enhancement with different frequency presets
- **Focus Guides**: Educational content on productivity techniques
- **Nootropics Database**: Curated supplement stacks for cognitive enhancement
- **Braverman Test**: Neurotransmitter profile assessment
- **Flashcards**: Spaced repetition learning system
- **Time Boxing Scheduler**: Calendar integration with ICS export
- **Training Hub**: Cognitive enhancement guides and language learning resources

## 🛠️ Tech Stack

- **Frontend**: React 18, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication)
- **Audio**: Tone.js for binaural beats
- **Deployment**: GitHub Pages

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Cryptk1ddo/DFRNT-hub-tech.git
   cd DFRNT-hub-tech
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   
   a. Go to [Firebase Console](https://console.firebase.google.com/)
   b. Create a new project
   c. Add a web app to your project
   d. Copy the configuration object
   e. Create a `.env` file in the root directory:
   ```bash
   cp env.example .env
   ```
   f. Fill in your Firebase configuration in the `.env` file:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key_here
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

4. **Set up Firestore Database**
   
   a. In Firebase Console, go to Firestore Database
   b. Create a database in test mode
   c. Set up the following security rules:
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

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📱 Usage

### Pomodoro Timer
- Set custom work intervals (25, 45, 60, or 90 minutes)
- Add and manage tasks
- Track work/break cycles
- Mark tasks as complete

### Binaural Beats
- Choose from preset frequencies (Delta, Theta, Alpha, Beta, Gamma)
- Adjust base and beat frequencies manually
- Start/stop audio playback

### Flashcards
- Create new flashcards with questions and answers
- Review cards using spaced repetition algorithm
- Track learning progress

### Scheduler
- Add time-boxed events
- Export schedule to calendar (ICS format)
- Manage daily tasks and appointments

## 🚀 Deployment

### Deploy to GitHub Pages

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy**
   ```bash
   npm run deploy
   ```

3. **Access your app**
   Visit: `https://cryptk1ddo.github.io/DFRNT-hub-tech`

### Manual Deployment

1. Build the project: `npm run build`
2. Push the `build` folder to the `gh-pages` branch
3. Enable GitHub Pages in your repository settings

## 🔧 Configuration

### Environment Variables

All Firebase configuration is handled through environment variables. See `env.example` for the required variables.

### Customization

- **Colors**: Modify the color scheme in `src/index.css` and `public/index.html`
- **Features**: Add new components in `src/App.js`
- **Styling**: Update Tailwind classes or add custom CSS

## 📁 Project Structure

```
DFRNT-hub-tech/
├── public/
│   └── index.html          # Main HTML template
├── src/
│   ├── App.js             # Main application component
│   ├── index.js           # React entry point
│   └── index.css          # Global styles
├── package.json           # Dependencies and scripts
├── env.example            # Environment variables template
└── README.md             # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Firebase for backend services
- Tone.js for audio processing
- Tailwind CSS for styling
- React team for the amazing framework

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/Cryptk1ddo/DFRNT-hub-tech/issues) page
2. Create a new issue with detailed information
3. Include your browser, OS, and steps to reproduce

---

**Made with ❤️ for productivity enthusiasts** 