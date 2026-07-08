# Vercel 環境參數設定文件

本文件整理 `online-order-template` 在 Vercel 正式環境需要設定的 Environment Variables。

目前專案分成兩個階段：

1. **目前模板版**：React + Vite + localStorage mock data，可直接部署測試。
2. **正式串接版**：後續接 Firebase、LINE LIFF、LINE Messaging API、Cloudinary、後台帳密登入。

> 重要原則：
> - `VITE_` 開頭的環境變數會被打包到前端，瀏覽器可以看到。
> - 任何 secret、token、private key、API secret 都不可使用 `VITE_` 開頭。
> - LINE Channel Secret、LINE Channel Access Token、Cloudinary API Secret、Firebase Admin Key 只能放在 Serverless API / 後端環境使用。

---

## 1. 目前模板版：現在 Vercel 需要先填的參數

目前程式實際讀取位置：

```txt
src/config/env.js
```

目前已經實際使用的變數如下：

| Key | 是否必填 | 建議值 | 用途 | 是否可公開 |
|---|---:|---|---|---|
| `VITE_APP_NAME` | 是 | `線上訂餐系統` | 系統名稱，顯示在 Header / PWA 等位置 | 可公開 |
| `VITE_STORE_NAME` | 是 | 你的品牌或店名 | 預設店家名稱 | 可公開 |
| `VITE_LINE_OFFICIAL_ACCOUNT_URL` | 建議填 | `https://lin.ee/xxxxxx` | 顧客加入 LINE 官方帳號的按鈕連結 | 可公開 |
| `VITE_USE_MOCK_DATA` | 是 | `true` | 目前模板版使用 localStorage mock data | 可公開 |

### 目前可直接貼到 Vercel 的設定

```env
VITE_APP_NAME=線上訂餐系統
VITE_STORE_NAME=你的店名
VITE_LINE_OFFICIAL_ACCOUNT_URL=https://lin.ee/你的LINE官方帳號連結
VITE_USE_MOCK_DATA=true
```

### 目前不要填成 `false`

目前正式 Firebase / 後端尚未接上，所以：

```env
VITE_USE_MOCK_DATA=true
```

先保持 `true`。

若改成：

```env
VITE_USE_MOCK_DATA=false
```

但 Firebase / API 尚未完成，資料讀寫會不完整。

---

## 2. 正式版前端公開參數：之後接 Firebase / LIFF 時會使用

以下是正式版前端可以使用的 `VITE_` 變數。這些值會出現在前端 bundle 裡，所以只能放公開設定，不可放 secret。

| Key | 用途 | 是否可公開 | 備註 |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web SDK API key | 可公開 | Firebase Web config，本身不是 Admin secret |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | 可公開 | 例如 `xxx.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | 可公開 | Firestore / Auth 會用 |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | 可公開 | 若未使用 Storage 可先不填 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID | 可公開 | Firebase Web config |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | 可公開 | Firebase Web config |
| `VITE_LINE_LIFF_ID` | LINE LIFF ID | 可公開 | 顧客 LIFF 登入 / LINE 內開啟時使用 |
| `VITE_LINE_OFFICIAL_ACCOUNT_URL` | LINE 官方帳號加入連結 | 可公開 | 目前已使用 |
| `VITE_USE_MOCK_DATA` | 是否使用 mock data | 可公開 | 正式接資料庫後改成 `false` |

### 正式版前端範例

```env
VITE_APP_NAME=線上訂餐系統
VITE_STORE_NAME=你的店名
VITE_LINE_OFFICIAL_ACCOUNT_URL=https://lin.ee/你的LINE官方帳號連結
VITE_USE_MOCK_DATA=false

VITE_FIREBASE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxxxxxx
VITE_LINE_LIFF_ID=2000000000-xxxxxxxx
```

---

## 3. 正式版後端 Secret：不可使用 `VITE_`

以下參數只能給 Vercel Serverless Functions / API Routes 使用，不可以暴露到前端。

| Key | 用途 | 是否可公開 | 備註 |
|---|---|---|---|
| `LINE_CHANNEL_SECRET` | LINE Webhook 驗證簽章 | 不可公開 | 只能在後端使用 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Push Message 發送通知 | 不可公開 | 只能在後端使用 |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | 可半公開 | 但建議與 upload API 一起放後端 |
| `CLOUDINARY_API_KEY` | Cloudinary API key | 不建議公開 | 後端使用 |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | 不可公開 | 絕對不可放前端 |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin SDK project id | 不可公開 | 後端管理權限使用 |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin SDK client email | 不可公開 | 後端使用 |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin SDK private key | 不可公開 | 後端使用，需處理換行 |
| `SESSION_SECRET` | 後台帳密登入 session / JWT 簽章 | 不可公開 | 自行產生長隨機字串 |
| `ADMIN_INIT_USERNAME` | 初始老闆帳號 | 不可公開 | 初始化後可移除或停用 |
| `ADMIN_INIT_PASSWORD` | 初始老闆密碼 | 不可公開 | 初始化後必須更換 |

### 正式版後端 Secret 範例

```env
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=000000000000000
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxx

FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxxxxxxx\n-----END PRIVATE KEY-----\n"

SESSION_SECRET=請產生一組至少32字元以上的隨機字串
ADMIN_INIT_USERNAME=admin
ADMIN_INIT_PASSWORD=請產生一組強密碼
```

---

## 4. Firebase 相關設定說明

### 4.1 前端 Firebase Web SDK

前端使用這組：

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

用途：

- 顧客資料
- 商品資料
- 門店資料
- 訂單資料
- 每日結帳資料

但注意：正式環境不能只靠前端限制權限，必須搭配：

- Firebase Auth
- Firestore Security Rules
- 或 Vercel API + Firebase Admin SDK

### 4.2 後端 Firebase Admin SDK

後端使用這組：

```env
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

用途：

- 後台帳密登入後的資料讀寫
- LINE Webhook 建立 / 更新訂單
- LINE Push Message 發送前查詢訂單
- 管理端跨門店查詢
- 權限較高的維護操作

### 4.3 `FIREBASE_ADMIN_PRIVATE_KEY` 注意事項

Vercel 裡通常需要把換行寫成 `\n`：

```env
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

後端程式讀取時通常要轉回換行：

```js
process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
```

---

## 5. LINE 相關設定說明

### 5.1 顧客端 LIFF

前端使用：

```env
VITE_LINE_LIFF_ID=
```

用途：

- 顧客 LINE 登入
- 取得 LINE userId
- 綁定顧客資料
- 查詢自己的訂單

### 5.2 LINE 官方帳號加入連結

前端使用：

```env
VITE_LINE_OFFICIAL_ACCOUNT_URL=
```

用途：

- 顧客未加入官方帳號時，引導加入
- 顧客才能接收訂單通知

### 5.3 LINE Messaging API

後端使用：

```env
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
```

用途：

- Webhook 簽章驗證
- 新訂單通知老闆 / 門店
- 接單通知顧客
- 取消通知顧客
- 完成通知顧客

注意：

```txt
LINE_CHANNEL_ACCESS_TOKEN 絕對不可放在前端，也不可使用 VITE_LINE_CHANNEL_ACCESS_TOKEN。
```

---

## 6. Cloudinary 圖片上傳設定

正式版商品圖片建議走 Cloudinary：

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

用途：

- 商品圖片上傳
- 商品圖片壓縮
- 商品圖片 CDN 顯示

正確流程：

```txt
後台選擇圖片
↓
前端壓縮
↓
呼叫 Vercel API Route
↓
API Route 使用 Cloudinary Secret 上傳
↓
回傳 imageUrl / publicId
↓
寫入 Firestore
```

錯誤做法：

```txt
前端直接使用 CLOUDINARY_API_SECRET
```

這會洩漏 secret，不可使用。

---

## 7. 後台帳密登入設定

目前規劃：

| 身份 | 登入方式 |
|---|---|
| 老闆 owner | 帳號密碼登入，可選綁 LINE 通知 |
| 門店 store | 帳號密碼登入，適合 POS / 公用平板 |
| 顧客 customer | LINE 登入 |

初始化時可暫時使用：

```env
ADMIN_INIT_USERNAME=admin
ADMIN_INIT_PASSWORD=請產生強密碼
SESSION_SECRET=請產生長隨機字串
```

正式初始化流程：

```txt
第一次部署
↓
使用 ADMIN_INIT_USERNAME / ADMIN_INIT_PASSWORD 登入
↓
建立正式老闆帳號
↓
修改密碼
↓
建立門店帳號
↓
停用或移除初始化帳密
```

---

## 8. Vercel 設定位置

在 Vercel 專案中：

```txt
Project Settings
↓
Environment Variables
```

建議三個環境都填：

```txt
Production
Preview
Development
```

至少正式上線要填：

```txt
Production
```

---

## 9. 建議分階段設定

### 階段 A：目前模板部署測試

先填：

```env
VITE_APP_NAME=線上訂餐系統
VITE_STORE_NAME=你的店名
VITE_LINE_OFFICIAL_ACCOUNT_URL=https://lin.ee/你的LINE官方帳號連結
VITE_USE_MOCK_DATA=true
```

### 階段 B：接 Firebase Web SDK

再補：

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_USE_MOCK_DATA=false
```

### 階段 C：接 LINE LIFF

再補：

```env
VITE_LINE_LIFF_ID=
```

### 階段 D：接 LINE 推播 / Webhook

再補後端 secret：

```env
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
```

### 階段 E：接商品圖片正式上傳

再補：

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 階段 F：接正式後台帳密登入

再補：

```env
SESSION_SECRET=
ADMIN_INIT_USERNAME=
ADMIN_INIT_PASSWORD=
```

若使用 Firebase Admin SDK，再補：

```env
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

---

## 10. 完整正式版環境參數總表

### 前端公開變數

```env
VITE_APP_NAME=
VITE_STORE_NAME=
VITE_LINE_OFFICIAL_ACCOUNT_URL=
VITE_USE_MOCK_DATA=

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_LINE_LIFF_ID=
```

### 後端 Secret 變數

```env
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

SESSION_SECRET=
ADMIN_INIT_USERNAME=
ADMIN_INIT_PASSWORD=
```

---

## 11. 安全檢查清單

正式上線前確認：

- [ ] 沒有把 `LINE_CHANNEL_ACCESS_TOKEN` 放進 `VITE_` 變數。
- [ ] 沒有把 `LINE_CHANNEL_SECRET` 放進 `VITE_` 變數。
- [ ] 沒有把 `CLOUDINARY_API_SECRET` 放進 `VITE_` 變數。
- [ ] 沒有把 `FIREBASE_ADMIN_PRIVATE_KEY` 放進 `VITE_` 變數。
- [ ] `.env` 沒有 commit 到 GitHub。
- [ ] Vercel Production 已填正式環境變數。
- [ ] `VITE_USE_MOCK_DATA=false` 前，Firebase / API 已完成串接。
- [ ] 後台初始化密碼已更換。
- [ ] Firestore Rules 或 API 權限檢查已完成。

---

## 12. 目前程式狀態備註

目前已實作的是模板版：

- React + Vite
- PWA
- localStorage mock data
- 顧客點餐頁
- 門店 POS 點餐頁
- 訂單管理
- 商品管理
- 門店設定
- 每日結帳

目前尚未正式串接：

- Firebase Firestore
- Firebase Auth
- LINE LIFF 真登入
- LINE Messaging API 真推播
- Cloudinary 真上傳
- 後台帳密登入

因此目前正式部署測試時，請先使用：

```env
VITE_USE_MOCK_DATA=true
```
