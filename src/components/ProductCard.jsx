import { Plus } from 'lucide-react'
import { formatPrice } from '../utils/price'

export default function ProductCard({ product, onSelect, compact = false, layout = 'grid', dense = false }) {
  if (layout === 'list') {
    return (
      <button
        type="button"
        onClick={() => product.isAvailable && onSelect(product)}
        className={`w-full rounded-3xl bg-white p-3 text-left transition hover:bg-cream ${!product.isAvailable ? 'opacity-45' : ''}`}
      >
        <div className="grid grid-cols-[96px_1fr_42px] gap-3 sm:grid-cols-[132px_1fr_48px]">
          <div className="overflow-hidden rounded-2xl bg-cream">
            {product.imageUrl ? (
              <img className="h-24 w-full object-cover sm:h-32" src={product.imageUrl} alt={product.name} loading="lazy" />
            ) : (
              <div className="flex h-24 w-full items-center justify-center px-3 text-center text-xs font-bold text-muted sm:h-32">{product.category || '商品圖片'}</div>
            )}
          </div>

          <div className="min-w-0 py-1">
            <p className="text-xs font-semibold text-accent">{product.category}</p>
            <h3 className="mt-1 line-clamp-2 text-base font-black leading-snug text-ink sm:text-xl">{product.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{product.description || '可客製化點餐選項'}</p>
            <p className="mt-3 text-lg font-black text-brand">{formatPrice(product.price)}<span className="ml-1 text-sm font-medium text-muted">/ 份</span></p>
          </div>

          <div className="flex items-center justify-end">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/70 text-white shadow-soft sm:h-12 sm:w-12">
              <Plus size={24} />
            </span>
          </div>
        </div>
        {!product.isAvailable && <div className="mt-3 text-sm font-semibold text-red-600">已下架</div>}
      </button>
    )
  }

  const imageHeight = dense ? 'h-24 md:h-32' : compact ? 'h-28 md:h-36' : 'h-44'
  const bodyPadding = dense ? 'p-2.5' : compact ? 'p-3' : 'p-5'
  const titleClass = dense ? 'mt-0.5 text-sm leading-tight' : compact ? 'mt-1 text-base' : 'mt-1 text-lg'
  const priceClass = dense ? 'mt-1 text-base' : 'mt-2 text-lg'
  const plusClass = dense ? 'right-2 top-2 h-8 w-8 rounded-xl' : 'right-3 top-3 h-9 w-9 rounded-2xl'

  return (
    <button
      type="button"
      onClick={() => product.isAvailable && onSelect(product)}
      className={`card overflow-hidden text-left transition hover:-translate-y-0.5 ${!product.isAvailable ? 'opacity-45' : ''}`}
    >
      <div className="relative bg-cream">
        {product.imageUrl ? (
          <img
            className={`${imageHeight} w-full object-cover`}
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className={`${imageHeight} flex w-full items-center justify-center bg-cream px-3 text-center text-xs font-bold text-muted`}>
            {product.category || '商品圖片'}
          </div>
        )}
        <span className={`absolute flex items-center justify-center bg-white/90 text-brand shadow-soft ${plusClass}`}>
          <Plus size={dense ? 16 : 18} />
        </span>
      </div>

      <div className={bodyPadding}>
        <div className="text-[11px] font-semibold text-accent">{product.category}</div>
        <h3 className={`${titleClass} font-bold text-ink`}>{product.name}</h3>
        {!compact && !dense && <p className="mt-2 line-clamp-2 text-sm text-muted">{product.description || '可客製化點餐選項'}</p>}
        <p className={`${priceClass} font-bold text-brand`}>{formatPrice(product.price)}</p>
        {!product.isAvailable && <div className="mt-2 text-xs font-semibold text-red-600">已下架</div>}
      </div>
    </button>
  )
}
