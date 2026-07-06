import { useEffect, useState } from 'react'
import ProductEditor from '../components/ProductEditor'
import ProductCard from '../components/ProductCard'
import { productService } from '../services/productService'
import { formatPrice } from '../utils/price'

export default function ProductManagementPage() {
  const [products, setProducts] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  async function loadProducts() {
    setProducts(await productService.listProducts())
  }

  useEffect(() => { loadProducts() }, [])

  async function saveProduct(product) {
    await productService.saveProduct(product)
    setEditingProduct(null)
    setIsCreating(false)
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
    if (!window.confirm('確定重置為示範商品？目前商品會被覆蓋。')) return
    await productService.resetProducts()
    await loadProducts()
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[420px_1fr]">
      <aside className="space-y-4">
        <section className="card p-5">
          <p className="text-xs font-semibold text-accent">Product Management</p>
          <h1 className="mt-1 text-3xl font-black">商品管理頁</h1>
          <p className="mt-3 text-sm text-muted">商品與客製化選項都先儲存在 localStorage。正式客戶版再接 Firebase。</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => { setIsCreating(true); setEditingProduct(null) }} type="button">新增商品</button>
            <button className="btn-secondary" onClick={resetProducts} type="button">重置示範資料</button>
          </div>
        </section>
        {(isCreating || editingProduct) && (
          <ProductEditor product={editingProduct} onCancel={() => { setIsCreating(false); setEditingProduct(null) }} onSave={saveProduct} />
        )}
      </aside>

      <main className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} className="space-y-3">
            <ProductCard product={product} onSelect={() => setEditingProduct(product)} />
            <div className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{formatPrice(product.price)}</p>
                  <p className="text-xs text-muted">{product.optionGroups?.length || 0} 組客製化選項</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${product.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{product.isAvailable ? '上架中' : '已下架'}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-secondary py-2" onClick={() => setEditingProduct(product)} type="button">編輯</button>
                <button className="btn-secondary py-2" onClick={() => toggleAvailable(product)} type="button">{product.isAvailable ? '下架' : '上架'}</button>
                <button className="btn-danger py-2" onClick={() => deleteProduct(product.id)} type="button">刪除</button>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
