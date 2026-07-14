import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getServerFirestore } from '../_lib/firebase.js'
import { json } from '../_lib/line.js'

function getQueryToken(req) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`)
    return url.searchParams.get('token') || ''
  } catch {
    return ''
  }
}

function getOwnerLineUserId() {
  const explicitOwnerLineUserId = process.env.OWNER_LINE_USER_ID || ''
  if (explicitOwnerLineUserId) return explicitOwnerLineUserId

  const notifyTarget = process.env.LINE_STORE_NOTIFY_TO || process.env.LINE_STORE_NOTIFY_USER_ID || ''
  return notifyTarget.startsWith('U') ? notifyTarget : ''
}

function buildOwnerPayload(now) {
  const username = process.env.OWNER_USERNAME || 'admin'
  const password = process.env.OWNER_PASSWORD || ''
  const displayName = process.env.OWNER_DISPLAY_NAME || '老闆'
  const lineUserId = getOwnerLineUserId()

  if (!password) {
    const error = new Error('missing_owner_password')
    error.code = 'missing_owner_password'
    throw error
  }

  return {
    username,
    password,
    role: 'owner',
    displayName,
    isActive: true,
    lineUserId,
    lineDisplayName: lineUserId ? displayName : '',
    lineBoundAt: lineUserId ? now : '',
    createdAt: now,
    updatedAt: now,
    createdBy: 'setup-init-owner'
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'method_not_allowed' })
  }

  const setupToken = process.env.SETUP_INIT_TOKEN || ''
  if (!setupToken) {
    return json(res, 500, { ok: false, error: 'missing_setup_init_token' })
  }

  if (getQueryToken(req) !== setupToken) {
    return json(res, 401, { ok: false, error: 'invalid_setup_token' })
  }

  try {
    const db = getServerFirestore()
    const ownerDocId = process.env.OWNER_DOC_ID || 'admin'
    const ownerRef = doc(db, 'adminUsers', ownerDocId)
    const existing = await getDoc(ownerRef)

    if (existing.exists()) {
      const data = existing.data() || {}
      return json(res, 200, {
        ok: true,
        skipped: true,
        reason: 'owner_already_exists',
        owner: {
          docId: ownerDocId,
          username: data.username || '',
          role: data.role || '',
          displayName: data.displayName || '',
          isActive: data.isActive !== false,
          hasLineUserId: Boolean(data.lineUserId)
        }
      })
    }

    const now = new Date().toISOString()
    const ownerPayload = buildOwnerPayload(now)
    await setDoc(ownerRef, ownerPayload)

    return json(res, 200, {
      ok: true,
      created: true,
      owner: {
        docId: ownerDocId,
        username: ownerPayload.username,
        role: ownerPayload.role,
        displayName: ownerPayload.displayName,
        isActive: ownerPayload.isActive,
        hasLineUserId: Boolean(ownerPayload.lineUserId),
        lineUserIdSource: process.env.OWNER_LINE_USER_ID ? 'OWNER_LINE_USER_ID' : (ownerPayload.lineUserId ? 'LINE_STORE_NOTIFY_TO' : '')
      }
    })
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error.code || error.message || 'unknown_error'
    })
  }
}
