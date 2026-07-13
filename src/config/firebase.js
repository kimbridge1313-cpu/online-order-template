import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { env, firebaseConfig } from './env'

let firebaseApp = null
let firestoreDb = null

export function getFirebaseApp() {
  if (!env.hasFirebaseConfig) return null
  if (!firebaseApp) firebaseApp = initializeApp(firebaseConfig)
  return firebaseApp
}

export function getFirestoreDb() {
  if (!env.hasFirebaseConfig) return null
  if (!firestoreDb) firestoreDb = getFirestore(getFirebaseApp())
  return firestoreDb
}

export function assertFirestoreReady() {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error('Firebase 尚未設定完整。請確認 Vercel 已填 VITE_FIREBASE_* 環境參數，或先將 VITE_USE_MOCK_DATA=true。')
  }
  return db
}
