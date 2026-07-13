const MAX_UPLOAD_SIZE_BYTES = 1024 * 1024
const TARGET_SIZE = 800
const MIME_TYPE = 'image/webp'
const INITIAL_QUALITY = 0.82
const MIN_QUALITY = 0.58

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('圖片讀取失敗。'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('圖片載入失敗。'))
    image.src = src
  })
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('圖片壓縮失敗。'))
      resolve(blob)
    }, MIME_TYPE, quality)
  })
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('壓縮圖片讀取失敗。'))
    reader.readAsDataURL(blob)
  })
}

function makeSafeFileName(name = 'product') {
  const baseName = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'product'
  return `${baseName}.webp`
}

export async function compressProductImage(file) {
  if (!file) return null
  if (!file.type.startsWith('image/')) throw new Error('請選擇圖片檔。')
  if (file.size > MAX_UPLOAD_SIZE_BYTES) throw new Error('圖片原始檔需小於 1MB。請先換一張較小的圖片。')

  const sourceDataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(sourceDataUrl)
  const ratio = Math.min(1, TARGET_SIZE / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, width, height)

  let quality = INITIAL_QUALITY
  let blob = await canvasToBlob(canvas, quality)
  while (blob.size > MAX_UPLOAD_SIZE_BYTES && quality > MIN_QUALITY) {
    quality -= 0.08
    blob = await canvasToBlob(canvas, quality)
  }

  if (blob.size > MAX_UPLOAD_SIZE_BYTES) throw new Error('壓縮後圖片仍超過 1MB，請改用更小的圖片。')

  const imageFile = new File([blob], makeSafeFileName(file.name), { type: MIME_TYPE })

  return {
    imageUrl: await blobToDataUrl(blob),
    imageFile,
    imageMeta: {
      originalName: file.name,
      originalSize: file.size,
      compressedSize: blob.size,
      width,
      height,
      mimeType: MIME_TYPE
    }
  }
}

export function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
