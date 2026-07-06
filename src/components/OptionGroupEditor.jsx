export default function OptionGroupEditor({ optionGroups = [], onChange }) {
  function updateGroup(index, patch) {
    const next = optionGroups.map((group, itemIndex) => itemIndex === index ? { ...group, ...patch } : group)
    onChange(next)
  }

  function updateOption(groupIndex, optionIndex, patch) {
    const next = optionGroups.map((group, itemIndex) => {
      if (itemIndex !== groupIndex) return group
      return {
        ...group,
        options: group.options.map((option, idx) => idx === optionIndex ? { ...option, ...patch } : option)
      }
    })
    onChange(next)
  }

  function addGroup() {
    onChange([
      ...optionGroups,
      {
        id: `group-${Date.now()}`,
        name: '新選項群組',
        type: 'single',
        required: false,
        options: [{ id: `option-${Date.now()}`, name: '新選項', priceDelta: 0 }]
      }
    ])
  }

  function removeGroup(index) {
    onChange(optionGroups.filter((_, itemIndex) => itemIndex !== index))
  }

  function addOption(groupIndex) {
    const next = optionGroups.map((group, itemIndex) => itemIndex === groupIndex ? {
      ...group,
      options: [...group.options, { id: `option-${Date.now()}`, name: '新選項', priceDelta: 0 }]
    } : group)
    onChange(next)
  }

  function removeOption(groupIndex, optionIndex) {
    const next = optionGroups.map((group, itemIndex) => itemIndex === groupIndex ? {
      ...group,
      options: group.options.filter((_, idx) => idx !== optionIndex)
    } : group)
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {optionGroups.map((group, groupIndex) => (
        <section key={group.id || groupIndex} className="rounded-3xl border border-line bg-cream p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-1 md:col-span-2">
              <span className="label">群組名稱</span>
              <input className="input" value={group.name} onChange={(event) => updateGroup(groupIndex, { name: event.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="label">類型</span>
              <select className="input" value={group.type} onChange={(event) => updateGroup(groupIndex, { type: event.target.value })}>
                <option value="single">單選</option>
                <option value="multiple">多選</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
              <input type="checkbox" checked={!!group.required} onChange={(event) => updateGroup(groupIndex, { required: event.target.checked })} />
              必選
            </label>
          </div>
          <div className="mt-4 space-y-2">
            {group.options.map((option, optionIndex) => (
              <div key={option.id || optionIndex} className="grid gap-2 rounded-2xl bg-white p-3 md:grid-cols-[1fr_140px_auto]">
                <input className="input" value={option.name} onChange={(event) => updateOption(groupIndex, optionIndex, { name: event.target.value })} placeholder="選項名稱" />
                <input className="input" type="number" value={option.priceDelta} onChange={(event) => updateOption(groupIndex, optionIndex, { priceDelta: Number(event.target.value) })} placeholder="加價" />
                <button className="btn-secondary py-2" type="button" onClick={() => removeOption(groupIndex, optionIndex)}>刪除</button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button className="btn-secondary py-2" type="button" onClick={() => addOption(groupIndex)}>新增選項</button>
            <button className="btn-danger py-2" type="button" onClick={() => removeGroup(groupIndex)}>刪除群組</button>
          </div>
        </section>
      ))}
      <button className="btn-secondary w-full" type="button" onClick={addGroup}>新增客製化選項群組</button>
    </div>
  )
}
