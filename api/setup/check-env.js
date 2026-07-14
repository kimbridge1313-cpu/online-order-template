import { json } from '../_lib/line.js'

function mask(value = '') {
  if (!value) return ''
  const text = String(value)
  if (text.length <= 8) return `${text.slice(0, 2)}***${text.slice(-2)}`
  return `${text.slice(0, 4)}***${text.slice(-4)}`
}

function readEnv(primary, fallback) {
  const value = process.env[primary] || (fallback ? process.env[fallback] : '') || ''
  return {
    hasValue: Boolean(value),
    source: process.env[primary] ? primary : (fallback && process.env[fallback] ? fallback : ''),
    preview: mask(value),
    length: value.length
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method_not_allowed' })

  const firebase = {
    apiKey: readEnv('VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY'),
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('VITE_FIREBASE_APP_ID', 'FIREBASE_APP_ID')
  }

  const firebaseOk = Object.values(firebase).every((item) => item.hasValue)

  const line = {
    channelAccessToken: readEnv('LINE_CHANNEL_ACCESS_TOKEN'),
    storeNotifyTo: readEnv('LINE_STORE_NOTIFY_TO', 'LINE_STORE_NOTIFY_USER_ID')
  }

  const setup = {
    setupInitToken: readEnv('SETUP_INIT_TOKEN'),
    ownerUsername: readEnv('OWNER_USERNAME'),
    ownerPassword: readEnv('OWNER_PASSWORD'),
    ownerDisplayName: readEnv('OWNER_DISPLAY_NAME'),
    ownerLineUserId: readEnv('OWNER_LINE_USER_ID')
  }

  return json(res, 200, {
    ok: true,
    firebaseOk,
    firebase,
    line,
    setup,
    nodeEnv: process.env.NODE_ENV || '',
    vercelEnv: process.env.VERCEL_ENV || ''
  })
}
