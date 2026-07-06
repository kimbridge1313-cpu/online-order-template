const diningTypes = [
  { value: 'dine_in', label: '內用' },
  { value: 'takeaway', label: '外帶自取' },
  { value: 'preorder', label: '預訂單' }
]

export default function DiningTypeSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {diningTypes.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${value === item.value ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
