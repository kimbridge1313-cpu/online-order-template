import { useEffect, useState } from 'react'
import OptionGroupEditor from './OptionGroupEditor'
import { cloudinaryImageService } from '../services/cloudinaryImageService'
import { formatFileSize } from '../utils/imageUpload'

const emptyProduct = {
  name: '',
  category: '',
  price: 0,
  description: '',
  imageUrl: '',
  imagePublicId: '',
  imageMeta: null,
  isAvailable: true,
  sortOrder: 999,
  optionGroups: []
}

export default function ProductEditor({ product, categories = [], onCancel, onSave }) {
  const defaultCategory = categories[0] || '未分類'
  const [draft, setDraft] = useState(product || { ...emptyProduct, category: defaultCategory })
  const [imageMessage, setImageMessage] = useState('')
  const [imageError, setImageError] = useState('')
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  useEffect(() => {
    setDraft(product || { ...emptyProduct, category: defaultCategory })
    setImageMessage('')
    setImageError('')
    setIsUploadingImage(false)
  }, [product, defaultCategory])

  function submit(event) {
    event.preventDefault()
    onSave({
      ...draft,
      category: draft.category || defaultCategory,
      price: Number(draft.price || 0),
      sortOrder: Number(draft.sortOrder || 999)
    })
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImageError('')
    setImageMessage('')
    setIsUploadingImage(true)
    try {
      const result = await cloudinaryImageService.uploadProductImage(file)
      setDraft({
        ...draft,
        imageUrl: result.imageUrl,
        imagePublicId: result.imagePublicId,
        imageMeta: result.imageMeta
      })
      setImageMessage(`已上傳 Cloudinary：${formatFileSize(result.imageMeta.originalSize)} → ${formatFileSize(result.imageMeta.compressedSize)}`)
    } catch (error) {
      setImageError(error.message || '圖片上傳失敗。')
    } finally {
      setIsUploadingImage(false)
    }
  }

  return (
    <form className="card p-5" onSubmit={submit}>
      <h2 className="text-xl font-black">{draft.id ? '編輯商品' : '新增商品'}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="label">商品名稱</span>
          <input className="input" required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label className="space-y-1">
          <span className="label">分類</span>
          <select className="input" value={draft.category || defaultCategory} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            {!categories.includes(draft.category) && draft.category && <option value={draft.category}>{draft.category}</option>}
          </select>
        </label>
        <label className="space-y-1">
          <span className="label">價格</span>
          <input className="input" type="number" min="0" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} />
        </label>
        <label className="space-y-1">
          <span className="label">排序</span>
          <input className="input" type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })} />
        </label>

        <section className="rounded-3xl border border-line bg-cream p-4 md:col-span-2">
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              {draft.imageUrl ? (
                <img className="aspect-square h-full w-full object-cover" src={draft.imageUrl} alt={draft.name || '商品圖片'} />
              ) : (
                <div className="flex aspect-square h-full w-full items-center justify-center p-4 text-center text-sm font-semibold text-muted">尚未上傳圖片</div>
              )}
            </div>
            <div>
              <h3 className="font-black">商品圖片</h3>
              <p className="mt-1 text-xs leading-5 text-muted">後台選擇圖片後，系統會先壓縮成 WebP，再上傳到 Cloudinary。商品資料只會保存圖片網址與 public_id。</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className={`btn-secondary cursor-pointer ${isUploadingImage ? 'pointer-events-none opacity-60' : ''}`}>
                  {isUploadingImage ? '上傳中...' : '選擇圖片上傳'}
                  <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} disabled={isUploadingImage} />
                </label>
                {draft.imageUrl && <button className="btn-danger" type="button" onClick={() => setDraft({ ...draft, imageUrl: '', imagePublicId: '', imageMeta: null })}>移除圖片</button>}
              </div>
              {imageMessage && <p className="mt-3 rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700">{imageMessage}</p>}
              {imageError && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">{imageError}</p>}
              {draft.imagePublicId && <p className="mt-3 break-all text-xs text-muted">Cloudinary：{draft.imagePublicId}</p>}
              {draft.imageMeta?.compressedSize && <p className="mt-2 text-xs text-muted">目前圖片：{formatFileSize(draft.imageMeta.compressedSize)}｜{draft.imageMeta.width} × {draft.imageMeta.height}</p>}
            </div>
          </div>
        </section>

        <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2">
          <input type="checkbox" checked={!!draft.isAvailable} onChange={(event) => setDraft({ ...draft, isAvailable: event.target.checked })} />
          商品上架
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="label">描述</span>
          <textarea className="input min-h-20" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </label>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black">客製化選項</h3>
          <span className="text-xs text-muted">溫度、甜度、加料等</span>
        </div>
        <OptionGroupEditor optionGroups={draft.optionGroups || []} onChange={(optionGroups) => setDraft({ ...draft, optionGroups })} />
      </div>

      <div className="mt-5 flex gap-2">
        <button className="btn-primary" type="submit" disabled={isUploadingImage}>儲存商品</button>
        <button className="btn-secondary" type="button" onClick={onCancel}>取消</button>
      </div>
    </form>
  )
}
