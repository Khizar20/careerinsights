# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for the CareerInsights application.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter a project name (e.g., "CareerInsights")
   - Enable/disable Google Analytics (optional)
   - Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click **Get Started**
3. Go to the **Sign-in method** tab
4. Enable **Email/Password** authentication:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

## Step 3: Get Your Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select **Project settings**
3. Scroll down to **Your apps** section
4. Click the **Web** icon (`</>`) to add a web app
5. Register your app with a nickname (e.g., "CareerInsights Web")
6. Copy the Firebase configuration object

## Step 4: Configure Environment Variables

1. In the `frontend` directory, create a `.env` file (if it doesn't exist)
2. Copy the values from your Firebase config into the `.env` file:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

**Important:** Replace all placeholder values with your actual Firebase configuration values.

## Step 5: Install Dependencies

Run the following command in the `frontend` directory:

```bash
npm install
```

This will install Firebase SDK and other dependencies.

## Step 6: Test the Setup

1. Start the frontend development server:
   ```bash
   npm start
   ```

2. Navigate to `http://localhost:3000`
3. You should see the login page
4. Try creating a new account with email and password
5. After successful signup/login, you should be redirected to the Resume Analyzer page

## Features Implemented

- ✅ Email/Password Authentication (Sign Up & Sign In)
- ✅ Password Reset (Forgot Password)
- ✅ Protected Routes (Dashboard, Resume Analyzer, Interview Prep)
- ✅ Automatic Redirect (Logged-in users redirected from login page)
- ✅ User Session Management (Persists across page refreshes)
- ✅ Logout Functionality

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Make sure your `.env` file is in the `frontend` directory
- Verify all environment variables are correctly set
- Restart the development server after changing `.env` file

### "Firebase: Error (auth/email-already-in-use)"
- This is normal - the email is already registered
- Try signing in instead of signing up

### "Firebase: Error (auth/weak-password)"
- Password must be at least 6 characters long

### Authentication not working
- Check browser console for errors
- Verify Firebase Authentication is enabled in Firebase Console
- Ensure Email/Password provider is enabled in Authentication settings

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file should already be in `.gitignore`
- Firebase API keys are safe to expose in client-side code (they're public by design)
- Firebase handles all authentication security on the backend

