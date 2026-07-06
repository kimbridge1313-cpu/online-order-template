import { useState } from 'react'
import OptionGroupEditor from './OptionGroupEditor'

const emptyProduct = {
  name: '',
  category: '飲品',
  price: 0,
  description: '',
  imageUrl: '',
  isAvailable: true,
  sortOrder: 999,
  optionGroups: []
}

export default function ProductEditor({ product, onCancel, onSave }) {
  const [draft, setDraft] = useState(product || emptyProduct)

  function submit(event) {
    event.preventDefault()
    onSave(draft)
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
          <input className="input" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
        </label>
        <label className="space-y-1">
          <span className="label">價格</span>
          <input className="input" type="number" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} />
        </label>
        <label className="space-y-1">
          <span className="label">排序</span>
          <input className="input" type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })} />
        </label>
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
        <button className="btn-primary" type="submit">儲存商品</button>
        <button className="btn-secondary" type="button" onClick={onCancel}>取消</button>
      </div>
    </form>
  )
}
