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
