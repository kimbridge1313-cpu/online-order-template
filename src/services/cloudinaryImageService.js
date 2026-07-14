import { env } from '../config/env'
import { compressProductImage } from '../utils/imageUpload'

function assertCloudinaryReady() {
  const config = env.cloudinary || {}
  if (!config.cloudName || !config.uploadPreset) {
    throw new Error('尚未設定 Cloudinary。請在 Vercel 加入 VITE_CLOUDINARY_CLOUD_NAME 與 VITE_CLOUDINARY_UPLOAD_PRESET。')
  }
  return config
}

async function uploadImage(file, folderSuffix = '') {
  const config = assertCloudinaryReady()
  const compressed = await compressProductImage(file)
  if (!compressed?.imageFile) throw new Error('圖片壓縮失敗。')

  const folder = folderSuffix
    ? `${String(config.folder || 'online-order').replace(/\/+$/, '')}/${folderSuffix}`
    : config.folder

  const formData = new FormData()
  formData.append('file', compressed.imageFile)
  formData.append('upload_preset', config.uploadPreset)
  if (folder) formData.append('folder', folder)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Cloudinary 圖片上傳失敗。')
  }

  return {
    imageUrl: data.secure_url,
    imagePublicId: data.public_id,
    imageMeta: {
      ...compressed.imageMeta,
      cloudinaryAssetId: data.asset_id || '',
      cloudinaryPublicId: data.public_id || '',
      cloudinaryVersion: data.version || '',
      cloudinaryFormat: data.format || '',
      cloudinaryBytes: data.bytes || compressed.imageMeta?.compressedSize || 0,
      uploadedAt: new Date().toISOString()
    }
  }
}

export const cloudinaryImageService = {
  async uploadProductImage(file) {
    return uploadImage(file)
  },

  async uploadStoreLogo(file) {
    return uploadImage(file, 'logos')
  }
}