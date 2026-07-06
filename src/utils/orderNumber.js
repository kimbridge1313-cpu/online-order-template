export function createOrderNumber() {
  const now = new Date()
  const ymd = now.toISOString().slice(0, 10).replaceAll('-', '')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `A${ymd}${random}`
}
