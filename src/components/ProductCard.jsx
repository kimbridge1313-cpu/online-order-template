import { Plus } from 'lucide-react'
import { formatPrice } from '../utils/price'

export default function ProductCard({ product, onSelect, compact = false, layout = 'grid' }) {
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
