# online-order-template

乾淨版線上訂餐系統模板。此 repo 不直接接 Firebase、不接 LINE API、不放任何客戶金鑰。第一版使用 sample data 與 localStorage，可直接部署到 Vercel 預覽。

## 功能

- 訂餐頁
  - 客人線上訂餐
  - 店家櫃檯點餐
  - 內用 / 外帶自取 / 預訂單
  - 商品客製化選項：單選、多選、必選、加價
  - 購物車與總金額計算
- 訂單管理頁
  - 依內用 / 外帶自取 / 預訂單分類
  - 日期與狀態篩選
  - 接單、製作中、完成、退單
  - 修改顧客資料、用餐方式、取餐時間、備註
- 商品管理頁
  - 新增 / 編輯 / 刪除商品
  - 上架 / 下架
  - 客製化選項群組與選項管理

## 本機開發

```bash
npm install
npm run dev
```

## 部署到 Vercel

1. 將專案推到 GitHub。
2. 在 Vercel 匯入 GitHub repo。
3. Framework Preset 選 Vite。
4. Build Command：`npm run build`
5. Output Directory：`dist`

## 環境變數

請參考 `.env.example`。模板版可以不設定任何環境變數也能運作。

```env
VITE_APP_NAME=線上訂餐系統
VITE_STORE_NAME=示範店家
VITE_LINE_OFFICIAL_ACCOUNT_URL=
VITE_USE_MOCK_DATA=true
```

## 安全原則

不要把以下內容放進 GitHub：

- `.env`
- Firebase Admin SDK private key
- LINE Channel Secret
- LINE Channel Access Token
- 客戶正式商品資料
- 客戶正式訂單資料

正式客戶版需透過 Vercel Environment Variables 接入 Firebase / LINE 設定。
