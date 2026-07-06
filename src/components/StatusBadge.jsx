const statusMap = {
  pending: '待處理',
  accepted: '已接單',
  preparing: '製作中',
  completed: '已完成',
  cancelled: '已取消'
}

const styleMap = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

export default function StatusBadge({ status }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styleMap[status] || 'bg-gray-100 text-gray-700'}`}>{statusMap[status] || status}</span>
}
