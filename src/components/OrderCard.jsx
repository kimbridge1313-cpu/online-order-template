import StatusBadge from './StatusBadge'
import { formatPrice } from '../utils/price'

const diningLabels = { dine_in: '內用', takeaway: '自取', preorder: '預訂單' }
const sourceLabels = { customer_online: '客人線上訂餐', counter: '店家櫃檯點餐' }

export default function OrderCard({ order, onStatusChange, onEdit, onCancel, readonly = false }) {
  return (
    <article className={`card p-4 ${order.status === 'cancelled' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-accent">{sourceLabels[order.source]}｜{diningLabels[order.diningType]}</p>
          <h3 className="mt-1 text-xl font-black">{order.orderNumber}</h3>
          <p className="mt-1 text-sm text-muted">{new Date(order.createdAt).toLocaleString('zh-TW')}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl bg-cream p-3 text-sm md:grid-cols-2">
        <p>姓名：{order.customer?.name || '未填'}</p>
        <p>手機：{order.customer?.phone || '未填'}</p>
        {order.pickupTime && <p className="md:col-span-2">取餐時間：{order.pickupTime}</p>}
        {order.note && <p className="md:col-span-2">備註：{order.note}</p>}
      </div>

      <div className="mt-4 space-y-3">
        {order.items.map((item, index) => (
          <div key={`${item.productId}-${index}`} className="rounded-2xl border border-line bg-white p-3">
            <div className="flex justify-between gap-3">
              <p className="font-bold">{item.name} × {item.quantity}</p>
              <p className="font-bold text-brand">{formatPrice(item.subtotal)}</p>
            </div>
            {item.selectedOptions?.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted">
                {item.selectedOptions.map((option) => (
                  <li key={`${index}-${option.groupId}-${option.optionId}`}>- {option.groupName}：{option.optionName}{option.priceDelta > 0 ? ` +${formatPrice(option.priceDelta)}` : ''}</li>
                ))}
              </ul>
            )}
            {item.note && <p className="mt-2 text-xs text-muted">商品備註：{item.note}</p>}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="font-bold">總金額</span>
        <span className="text-2xl font-black text-brand">{formatPrice(order.totalAmount)}</span>
      </div>

      {!readonly && (
        <div className="mt-4 flex flex-wrap gap-2">
          {order.status === 'pending' && <button className="btn-secondary py-2" onClick={() => onStatusChange(order.id, 'accepted')}>接單</button>}
          {order.status !== 'cancelled' && order.status !== 'completed' && <button className="btn-secondary py-2" onClick={() => onStatusChange(order.id, 'preparing')}>製作中</button>}
          {order.status !== 'cancelled' && <button className="btn-secondary py-2" onClick={() => onStatusChange(order.id, 'completed')}>完成</button>}
          {order.status !== 'cancelled' && <button className="btn-secondary py-2" onClick={() => onEdit(order)}>修改</button>}
          {order.status !== 'cancelled' && <button className="btn-danger py-2" onClick={() => onCancel(order.id)}>退單</button>}
        </div>
      )}
    </article>
  )
}
