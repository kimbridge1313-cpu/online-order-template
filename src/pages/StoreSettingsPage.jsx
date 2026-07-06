import { useState } from 'react'
import { Settings } from 'lucide-react'
import { readStorage, writeStorage } from '../utils/storage'

const STORE_SETTINGS_KEY = 'online-order-template-store-settings'
const defaultSettings = { tableNumberEnabled: false }

export default function StoreSettingsPage() {
  const [settings, setSettings] = useState(() => readStorage(STORE_SETTINGS_KEY, defaultSettings))

  function updateSettings(nextSettings) {
    setSettings(nextSettings)
    writeStorage(STORE_SETTINGS_KEY, nextSettings)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <section className="card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream text-brand">
            <Settings size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-accent">Store Settings</p>
            <h1 className="text-3xl font-black">門店設定</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">這裡放門店營運設定。模板版先使用 localStorage，正式版可接到 Firebase 店家設定。</p>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="text-xl font-black">桌號設定</h2>
        <p className="mt-2 text-sm text-muted">開啟後，門店訂餐頁會顯示桌號欄位；關閉後不會出現桌號。</p>
        <label className="mt-5 flex items-center justify-between gap-4 rounded-3xl border border-line bg-white p-4">
          <span>
            <span className="block font-bold text-ink">啟用桌號</span>
            <span className="mt-1 block text-xs text-muted">適合內用桌邊點餐、平板櫃檯點餐。</span>
          </span>
          <input
            className="h-5 w-5"
            type="checkbox"
            checked={!!settings.tableNumberEnabled}
            onChange={(event) => updateSettings({ ...settings, tableNumberEnabled: event.target.checked })}
          />
        </label>
      </section>
    </div>
  )
}
