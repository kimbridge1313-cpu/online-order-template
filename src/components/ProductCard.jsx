import { Plus } from 'lucide-react'
import { formatPrice } from '../utils/price'

export default function ProductCard({ product, onSelect, compact = false }) {
  return (
    <button
      type="button"
      onClick={() => product.isAvailable && onSelect(product)}
      className={`card text-left transition hover:-translate-y-0.5 ${!product.isAvailable ? 'opacity-45' : ''} ${compact ? 'p-4' : 'p-5'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-accent">{product.category}</div>
          <h3 className="mt-1 text-lg font-bold text-ink">{product.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted">{product.description || '可客製化點餐選項'}</p>
          <p className="mt-3 text-lg font-bold text-brand">{formatPrice(product.price)}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cream text-brand">
          <Plus size={20} />
        </span>
      </div>
      {!product.isAvailable && <div className="mt-3 text-sm font-semibold text-red-600">已下架</div>}
    </button>
  )
}
