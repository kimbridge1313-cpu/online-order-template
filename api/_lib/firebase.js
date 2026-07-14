import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

function getFirebaseConfig() {
  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || ''
  }
}

function hasFirebaseConfig(config) {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
}

export function getServerFirestore() {
  const config = getFirebaseConfig()
  if (!hasFirebaseConfig(config)) {
    const error = new Error('missing_firebase_env')
    error.code = 'missing_firebase_env'
    throw error
  }
  const app = getApps().length ? getApps()[0] : initializeApp(config)
  return getFirestore(app)
}
