export const allDiningTypes = [
  { value: 'dine_in', label: '內用' },
  { value: 'takeaway', label: '自取' },
  { value: 'delivery', label: '外送' }
]

export const diningLabels = allDiningTypes.reduce((labels, item) => ({ ...labels, [item.value]: item.label }), {})

export default function DiningTypeSelector({ value, onChange, options = allDiningTypes }) {
  const visibleOptions = options.length > 0 ? options : allDiningTypes.slice(0, 1)
  return (
    <div className={`grid gap-2 ${visibleOptions.length === 1 ? 'grid-cols-1' : visibleOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {visibleOptions.map((item) => (
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
