import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { env } from '../config/env'
import { assertFirestoreReady } from '../config/firebase'
import { liffService } from './liffService'

const INVITES_COLLECTION = 'adminInvites'
const ADMIN_USERS_COLLECTION = 'adminUsers'

function createCode() {
  const random = Math.random().toString(36).slice(2, 10)
  return `invite-${Date.now()}-${random}`
}

function currentOrigin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

function normalizeInvite(id, data = {}) {
  return {
    id,
    code: data.code || id,
    role: data.role === 'owner' ? 'owner' : 'store',
    storeId: data.storeId || '',
    storeName: data.storeName || '',
    note: data.note || '',
    isUsed: !!data.isUsed,
    isRevoked: !!data.isRevoked,
    createdBy: data.createdBy || '',
    createdAt: data.createdAt || '',
    usedBy: data.usedBy || '',
    usedAt: data.usedAt || ''
  }
}

function inviteLink(code) {
  return `${currentOrigin()}/admin/invite?code=${encodeURIComponent(code)}`
}

async function createInviteWithFirebase(payload = {}) {
  const db = assertFirestoreReady()
  const code = createCode()
  const now = new Date().toISOString()
  const invite = {
    code,
    role: payload.role === 'owner' ? 'owner' : 'store',
    storeId: payload.role === 'owner' ? '' : payload.storeId || '',
    storeName: payload.role === 'owner' ? '' : payload.storeName || '',
    note: payload.note || '',
    isUsed: false,
    isRevoked: false,
    createdBy: payload.createdBy || '',
    createdAt: now,
    updatedAt: now,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp()
  }
  await setDoc(doc(db, INVITES_COLLECTION, code), invite)
  return { ...normalizeInvite(code, invite), link: inviteLink(code) }
}

async function listInvitesWithFirebase() {
  const db = assertFirestoreReady()
  const snapshot = await getDocs(query(collection(db, INVITES_COLLECTION), orderBy('createdAt', 'desc')))
  return snapshot.docs.map((item) => ({ ...normalizeInvite(item.id, item.data()), link: inviteLink(item.id) }))
}

async function getInviteWithFirebase(code) {
  const db = assertFirestoreReady()
  const cleanCode = String(code || '').trim()
  if (!cleanCode) throw new Error('邀請連結缺少邀請碼。')
  const snapshot = await getDoc(doc(db, INVITES_COLLECTION, cleanCode))
  if (!snapshot.exists()) throw new Error('邀請連結不存在或已失效。')
  const invite = normalizeInvite(snapshot.id, snapshot.data())
  if (invite.isRevoked) throw new Error('此邀請已停用。')
  if (invite.isUsed) throw new Error('此邀請已使用。')
  return invite
}

async function acceptInviteWithFirebase({ code, username, password, displayName }) {
  const db = assertFirestoreReady()
  const invite = await getInviteWithFirebase(code)
  const cleanUsername = String(username || '').trim()
  if (!cleanUsername) throw new Error('請輸入帳號。')
  if (!password) throw new Error('請設定密碼。')
  if (!env.isLiffEnabled) throw new Error('尚未設定 LINE LIFF ID，無法綁定 LINE 身份。')

  const lineProfile = await liffService.getProfile({ requireLogin: true }).catch((error) => {
    console.warn('LINE profile required for invite accept:', error)
    return null
  })

  if (!lineProfile?.userId) {
    throw new Error('請先完成 LINE 授權登入，再建立管理帳號。')
  }

  const userRef = doc(db, ADMIN_USERS_COLLECTION, cleanUsername)
  const exists = await getDoc(userRef)
  if (exists.exists()) throw new Error('此帳號已存在，請改用其他帳號。')

  const now = new Date().toISOString()
  const user = {
    username: cleanUsername,
    password,
    role: invite.role,
    storeId: invite.role === 'owner' ? '' : invite.storeId || '',
    storeName: invite.role === 'owner' ? '' : invite.storeName || '',
    displayName: displayName || cleanUsername,
    isActive: true,
    lineUserId: lineProfile.userId,
    lineDisplayName: lineProfile.displayName || '',
    linePictureUrl: lineProfile.pictureUrl || '',
    lineBoundAt: now,
    createdAt: now,
    updatedAt: now,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp()
  }
  await setDoc(userRef, user)
  await updateDoc(doc(db, INVITES_COLLECTION, invite.code), {
    isUsed: true,
    usedBy: cleanUsername,
    usedLineUserId: lineProfile.userId,
    usedAt: now,
    usedAtServer: serverTimestamp(),
    updatedAt: now,
    updatedAtServer: serverTimestamp()
  })
  return {
    username: cleanUsername,
    role: user.role,
    storeId: user.storeId,
    storeName: user.storeName,
    displayName: user.displayName,
    isActive: true,
    lineUserId: lineProfile.userId,
    lineDisplayName: lineProfile.displayName || '',
    linePictureUrl: lineProfile.pictureUrl || '',
    lineBoundAt: now
  }
}

async function revokeInviteWithFirebase(code) {
  const db = assertFirestoreReady()
  await updateDoc(doc(db, INVITES_COLLECTION, code), {
    isRevoked: true,
    updatedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp()
  })
  return listInvitesWithFirebase()
}

export const adminInviteService = {
  async createInvite(payload) {
    if (env.useMockData) throw new Error('模板模式不支援正式邀請。')
    return createInviteWithFirebase(payload)
  },

  async listInvites() {
    if (env.useMockData) return []
    return listInvitesWithFirebase()
  },

  async getInvite(code) {
    if (env.useMockData) throw new Error('模板模式不支援正式邀請。')
    return getInviteWithFirebase(code)
  },

  async acceptInvite(payload) {
    if (env.useMockData) throw new Error('模板模式不支援正式邀請。')
    return acceptInviteWithFirebase(payload)
  },

  async revokeInvite(code) {
    if (env.useMockData) throw new Error('模板模式不支援正式邀請。')
    return revokeInviteWithFirebase(code)
  }
}
