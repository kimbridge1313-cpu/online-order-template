import { useEffect, useMemo, useState } from 'react'
import { Pencil, Tags, Trash2, X } from 'lucide-react'
import ProductEditor from '../components/ProductEditor'
import { productService } from '../services/productService'
import { formatPrice } from '../utils/price'
import { readStorage, writeStorage } from '../utils/storage'

const CATEGORY_STORAGE_KEY = 'online-order-template-categories'
const FALLBACK_CATEGORIES = ['飲品', '主餐', '套餐']

function getInitialCategories(products) {
  const saved = readStorage(CATEGORY_STORAGE_KEY, null)
  const productCategories = products.map((product) => product.category).filter(Boolean)
  const merged = [...(saved || []), ...productCategories, ...FALLBACK_CATEGORIES]
  return Array.from(new Set(merged))
}

export default function ProductManagementPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const [activeCategory, setActiveCategory] = useState('全部')
  const [editingProduct, setEditingProduct] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [categoryDraft, setCategoryDraft] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  async function loadProducts() {
    const data = await productService.listProducts()
    setProducts(data)
    const nextCategories = getInitialCategories(data)
    setCategories(nextCategories)
    writeStorage(CATEGORY_STORAGE_KEY, nextCategories)
  }

  useEffect(() => { loadProducts() }, [])

  const tabItems = useMemo(() => ['全部', ...categories], [categories])
  const visibleProducts = useMemo(() => {
    return products.filter((product) => activeCategory === '全部' || product.category === activeCategory)
  }, [products, activeCategory])

  function persistCategories(nextCategories) {
    const clean = Array.from(new Set(nextCategories.map((item) => item.trim()).filter(Boolean)))
    setCategories(clean)
    writeStorage(CATEGORY_STORAGE_KEY, clean)
    if (activeCategory !== '全部' && !clean.includes(activeCategory)) setActiveCategory('全部')
    return clean
  }

  async function saveProduct(product) {
    const savedCategory = product.category || categories[0] || '未分類'
    if (!categories.includes(savedCategory)) persistCategories([...categories, savedCategory])
    await productService.saveProduct({ ...product, category: savedCategory })
    closeEditor()
    await loadProducts()
  }

  async function deleteProduct(productId) {
    if (!window.confirm('確定要刪除這個商品？')) return
    await productService.deleteProduct(productId)
    await loadProducts()
  }

  async function toggleAvailable(product) {
    await productService.saveProduct({ ...product, isAvailable: !product.isAvailable })
    await loadProducts()
  }

  async function resetProducts() {
    if (!window.confirm('確定重置為示範商品？目前商品與分類會被覆蓋。')) return
    await productService.resetProducts()
    writeStorage(CATEGORY_STORAGE_KEY, FALLBACK_CATEGORIES)
    setActiveCategory('全部')
    closeEditor()
    await loadProducts()
  }

  function createProduct() {
    setEditingProduct(null)
    setIsCreating(true)
  }

  function editProduct(product) {
    setIsCreating(false)
    setEditingProduct({
      ...product,
      optionGroups: (product.optionGroups || []).map((group) => ({
        ...group,
        options: (group.options || []).map((option) => ({ ...option }))
      }))
    })
  }

  function closeEditor() {
    setIsCreating(false)
    setEditingProduct(null)
  }

  function addCategory() {
    const nextName = categoryDraft.trim()
    if (!nextName) return
    if (categories.includes(nextName)) {
      setCategoryDraft('')
      setActiveCategory(nextName)
      return
    }
    persistCategories([...categories, nextName])
    setCategoryDraft('')
    setActiveCategory(nextName)
  }

  async function renameCategory(oldName) {
    const nextName = editingCategoryName.trim()
    if (!nextName || nextName === oldName) {
      setEditingCategory(null)
      setEditingCategoryName('')
      return
    }
    if (categories.includes(nextName)) {
      window.alert('這個分類名稱已存在。')
      return
    }
    const nextCategories = categories.map((category) => (category === oldName ? nextName : category))
    persistCategories(nextCategories)
    const targetProducts = products.filter((product) => product.category === oldName)
    await Promise.all(targetProducts.map((product) => productService.saveProduct({ ...product, category: nextName })))
    setEditingCategory(null)
    setEditingCategoryName('')
    setActiveCategory(nextName)
    await loadProducts()
  }

  async function deleteCategory(categoryName) {
    const usedCount = products.filter((product) => product.category === categoryName).length
    const message = usedCount > 0
      ? `「${categoryName}」底下有 ${usedCount} 個商品。刪除分類後，這些商品會改為「未分類」。確定刪除？`
      : `確定刪除「${categoryName}」分類？`
    if (!window.confirm(message)) return

    const nextCategories = categories.filter((category) => category !== categoryName)
    const finalCategories = nextCategories.includes('未分類') ? nextCategories : [...nextCategories, '未分類']
    persistCategories(finalCategories)
    const targetProducts = products.filter((product) => product.category === categoryName)
    await Promise.all(targetProducts.map((product) => productService.saveProduct({ ...product, category: '未分類' })))
    setActiveCategory('全部')
    await loadProducts()
  }

  const editorOpen = isCreating || !!editingProduct

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[420px_1fr]">
      <aside className="space-y-4">
        <section className="card p-5">
          <p className="text-xs font-semibold text-accent">Product Management</p>
          <h1 className="mt-1 text-3xl font-black">商品管理頁</h1>
          <p className="mt-3 text-sm text-muted">商品資料儲存在系統資料庫；商品圖片會上傳到 Cloudinary，資料庫只保存圖片網址。</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={createProduct} type="button">新增商品</button>
            <button className="btn-secondary" onClick={resetProducts} type="button">重置示範資料</button>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2">
            <Tags className="text-accent" size={18} />
            <h2 className="font-black">商品分類</h2>
          </div>
          <div className="mt-4 flex gap-2">
            <input className="input" placeholder="新增分類，例如：飲品" value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addCategory() }} />
            <button className="btn-primary shrink-0" type="button" onClick={addCategory}>新增</button>
          </div>

          <div className="mt-4 space-y-2">
            {categories.map((category) => (
              <div key={category} className="rounded-2xl border border-line bg-white p-3">
                {editingCategory === category ? (
                  <div className="flex gap-2">
                    <input className="input" value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') renameCategory(category) }} />
                    <button className="btn-primary shrink-0 py-2" type="button" onClick={() => renameCategory(category)}>儲存</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <button className="text-left text-sm font-bold text-ink" type="button" onClick={() => setActiveCategory(category)}>{category}</button>
                    <div className="flex gap-1">
                      <button className="rounded-xl border border-line p-2 text-muted hover:text-brand" type="button" onClick={() => { setEditingCategory(category); setEditingCategoryName(category) }} aria-label="編輯分類"><Pencil size={16} /></button>
                      <button className="rounded-xl border border-line p-2 text-red-600 hover:bg-red-50" type="button" onClick={() => deleteCategory(category)} aria-label="刪除分類"><Trash2 size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </aside>

      <main className="space-y-4">
        <div className="flex gap-2 overflow-auto pb-1">
          {tabItems.map((item) => (
            <button key={item} type="button" onClick={() => setActiveCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${activeCategory === item ? 'bg-brand text-white' : 'bg-white text-muted'}`}>
              {item}
            </button>
          ))}
        </div>

        {visibleProducts.length === 0 ? (
          <section className="card p-8 text-center">
            <p className="font-black">目前沒有商品</p>
            <p className="mt-2 text-sm text-muted">請新增商品，或切換到其他分類。</p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <article key={product.id} className={`card flex flex-col overflow-hidden ${!product.isAvailable ? 'opacity-60' : ''}`}>
                <div className="h-40 bg-cream">
                  {product.imageUrl ? (
                    <img className="h-full w-full object-cover" src={product.imageUrl} alt={product.name} loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm font-bold text-muted">尚未上傳圖片</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-accent">{product.category}</p>
                      <h3 className="mt-1 text-xl font-black text-ink">{product.name}</h3>
                      <p className="mt-2 line-clamp-2 text-sm text-muted">{product.description || '未填寫商品描述'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${product.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{product.isAvailable ? '上架中' : '已下架'}</span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-2xl font-black text-brand">{formatPrice(product.price)}</p>
                      <p className="mt-1 text-xs text-muted">{product.optionGroups?.length || 0} 組客製化選項</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button className="btn-secondary py-2" onClick={() => editProduct(product)} type="button">編輯</button>
                      <button className="btn-secondary py-2" onClick={() => toggleAvailable(product)} type="button">{product.isAvailable ? '下架' : '上架'}</button>
                      <button className="btn-danger py-2" onClick={() => deleteProduct(product.id)} type="button">刪除</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {editorOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex justify-end">
              <button className="rounded-2xl bg-white p-3 text-ink shadow-soft" type="button" onClick={closeEditor} aria-label="關閉編輯視窗"><X size={20} /></button>
            </div>
            <ProductEditor categories={categories} product={editingProduct} onCancel={closeEditor} onSave={saveProduct} />
          </div>
        </div>
      )}
    </div>
  )
}
