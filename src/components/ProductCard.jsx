import { Plus } from 'lucide-react'
import { formatPrice } from '../utils/price'

export default function ProductCard({ product, onSelect, compact = false }) {
  return (
    <button
      type="button"
      onClick={() => product.isAvailable && onSelect(product)}
      className={`card overflow-hidden text-left transition hover:-translate-y-0.5 ${!product.isAvailable ? 'opacity-45' : ''}`}
    >
      <div className="relative bg-cream">
        {product.imageUrl ? (
          <img
            className={`${compact ? 'h-28 md:h-36' : 'h-44'} w-full object-cover`}
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className={`${compact ? 'h-28 md:h-36' : 'h-44'} flex w-full items-center justify-center bg-cream px-4 text-center text-sm font-bold text-muted`}>
            {product.category || '商品圖片'}
          </div>
        )}
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/90 text-brand shadow-soft">
          <Plus size={18} />
        </span>
      </div>

      <div className={compact ? 'p-3' : 'p-5'}>
        <div className="text-xs font-semibold text-accent">{product.category}</div>
        <h3 className={`${compact ? 'mt-1 text-base' : 'mt-1 text-lg'} font-bold text-ink`}>{product.name}</h3>
        {!compact && <p className="mt-2 line-clamp-2 text-sm text-muted">{product.description || '可客製化點餐選項'}</p>}
        <p className="mt-2 text-lg font-bold text-brand">{formatPrice(product.price)}</p>
        {!product.isAvailable && <div className="mt-3 text-sm font-semibold text-red-600">已下架</div>}
      </div>
    </button>
  )
}
