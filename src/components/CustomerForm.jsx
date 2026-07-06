export default function CustomerForm({ customer, onChange, note, onNoteChange, required = false }) {
  function setField(field, value) {
    onChange({ ...customer, [field]: value })
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="label">顧客姓名{required ? ' *' : ''}</span>
          <input className="input" value={customer.name || ''} onChange={(event) => setField('name', event.target.value)} placeholder="王小明" />
        </label>
        <label className="space-y-1">
          <span className="label">手機{required ? ' *' : ''}</span>
          <input className="input" value={customer.phone || ''} onChange={(event) => setField('phone', event.target.value)} placeholder="0912-345-678" />
        </label>
      </div>
      <label className="space-y-1 block">
        <span className="label">訂單備註</span>
        <textarea className="input min-h-20" value={note || ''} onChange={(event) => onNoteChange(event.target.value)} placeholder="餐具、取餐、其他需求" />
      </label>
    </div>
  )
}
