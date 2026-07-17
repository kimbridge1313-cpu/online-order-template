export function formatPrice(value) {
  return `$${Number(value || 0).toLocaleString('zh-TW')}`
}

export function sumSelectedOptions(selectedOptions = []) {
  return selectedOptions.reduce((sum, option) => sum + Number(option.priceDelta || 0), 0)
}

export function calculateUnitPrice(product, selectedOptions = []) {
  return Number(product.price || 0) + sumSelectedOptions(selectedOptions)
}

export function calculateCartTotal(items = []) {
  return items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
}

function calculateBogoDiscount(items = []) {
  const unitPrices = items.flatMap((item) => {
    const quantity = Number(item.quantity || 0)
    const unitPrice = Number(item.unitPrice ?? item.basePrice ?? 0)
    return Array.from({ length: quantity }, () => unitPrice)
  }).filter((value) => value > 0)

  if (unitPrices.length < 2) return 0
  return Math.min(...unitPrices)
}

export function normalizeDiscount(discount = {}) {
  return {
    id: discount.id || `discount-${Date.now()}`,
    name: String(discount.name || '').trim(),
    type: discount.type || 'fixed_amount',
    value: Number(discount.value || 0),
    isActive: discount.isActive !== false,
    note: String(discount.note || '').trim()
  }
}

export function calculateDiscountAmount(items = [], discounts = []) {
  const subtotal = calculateCartTotal(items)
  if (subtotal <= 0) return 0

  const amount = discounts.reduce((sum, discount) => {
    const current = normalizeDiscount(discount)
    if (!current.isActive) return sum
    if (current.type === 'fixed_amount') return sum + Math.max(0, current.value)
    if (current.type === 'percent') return sum + Math.max(0, Math.round(subtotal * Math.min(current.value, 100) / 100))
    if (current.type === 'bogo') return sum + calculateBogoDiscount(items)
    return sum
  }, 0)

  return Math.min(subtotal, Math.max(0, amount))
}

export function calculateOrderTotal(items = [], discounts = []) {
  const subtotal = calculateCartTotal(items)
  const discountAmount = calculateDiscountAmount(items, discounts)
  return Math.max(0, subtotal - discountAmount)
}
