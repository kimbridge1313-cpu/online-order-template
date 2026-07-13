function hasFirebaseConfig(config) {
  return Boolean(
    config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.appId
  )
}

const vercelEnv = import.meta.env.VITE_VERCEL_ENV || ''

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
}

export const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
  folder: import.meta.env.VITE_CLOUDINARY_FOLDER || 'online-order/products'
}

export const env = {
  appName: import.meta.env.VITE_APP_NAME || '線上訂餐系統',
  storeName: import.meta.env.VITE_STORE_NAME || '示範店家',
  lineOfficialAccountUrl: import.meta.env.VITE_LINE_OFFICIAL_ACCOUNT_URL || '',
  lineLiffId: import.meta.env.VITE_LINE_LIFF_ID || '',
  useMockData: import.meta.env.VITE_USE_MOCK_DATA !== 'false',
  firebase: firebaseConfig,
  cloudinary: cloudinaryConfig,
  hasFirebaseConfig: hasFirebaseConfig(firebaseConfig),
  hasCloudinaryConfig: Boolean(cloudinaryConfig.cloudName && cloudinaryConfig.uploadPreset),
  isLiffEnabled: Boolean(import.meta.env.VITE_LINE_LIFF_ID),
  vercelEnv,
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
  isPreview: vercelEnv === 'preview',
  isProductionDeploy: vercelEnv === 'production'
}
