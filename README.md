# 日語假名學習工具

一個專為繁體中文使用者設計的日語假名學習網頁應用程式，支援平假名和片假名的互動式學習。

📋 [查看更新日誌（CHANGELOG）](./CHANGELOG.md)

## 功能特色

### 📚 字母表檢視
- 完整的平假名和片假名字母表
- 包含清音、濁音、半濁音和拗音
- 點擊字符可查看羅馬字讀音和筆順動畫
- 使用瀏覽器的語音合成 API 播放日語發音（如果可用）
- 可依類型篩選顯示

### 🧠 測驗模式
- **假名 → 羅馬字**：看假名選擇正確的羅馬字
- **羅馬字 → 假名**：看羅馬字選擇正確的假名
- 可自選練習的行段（あ行、か行等）
- 支援「弱項練習」模式，自動練習正確率低於 70% 的字符
- 即時回饋和計分

### 📅 間隔重複複習（Spaced Repetition）
- 基於 SM-2 演算法的智慧複習系統
- 根據答題記錄自動安排複習時間
- 每日複習模式顯示待複習字符
- 導航列顯示待複習數量徽章
- 自動遷移現有進度資料

### ✍️ 手寫練習
- Canvas 繪圖系統，支援觸控與滑鼠
- 顯示目標假名與羅馬拼音
- 可切換的描摹輔助線
- 筆順動畫演示（含筆畫編號）
- 復原、清除、跳過控制
- 自我評分整合至間隔重複系統
- 手機觸控優化

### 📊 進度追蹤
- 使用 localStorage 儲存學習進度（鍵名 `japanese-learning-progress`）
- 可選擇用 Google 帳號登入，把同一份進度同步到手機與電腦（需站長設定 Firebase，見下方說明）
- 沒有設定 Firebase 時，進度只留在這台裝置，匯出與匯入的用法不變
- 追蹤每個字符的正確率和複習排程
- 視覺化顯示各字符的表現
- 自動標記弱項字符供重點練習

### 📱 響應式設計
- 完全支援手機和桌面瀏覽器
- 優化觸控操作體驗
- 深色模式支援

## 技術架構

- **框架**: React 19 + TypeScript
- **建置工具**: Vite 8
- **樣式**: Tailwind CSS 4
- **圖示**: Lucide React
- **語音**: Web Speech API
- **筆順資料**: KanjiVG (CC BY-SA 3.0)

## 筆順資料來源

本應用程式使用 [KanjiVG](https://github.com/KanjiVG/kanjivg) 的筆順資料，該資料以 Creative Commons Attribution-Share Alike 3.0 授權發布。

**KanjiVG 授權資訊：**
- Copyright (C) 2009-2012 Ulrich Apel
- License: [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/)
- Website: http://kanjivg.tagaini.net

## 本地開發

### 環境需求

- Node.js 18 或更新版本
- npm 或 yarn

### 安裝步驟

1. 安裝依賴套件：

```bash
npm install
```

2. 啟動開發伺服器：

```bash
npm run dev
```

3. 在瀏覽器中開啟顯示的本地網址（通常是 `http://localhost:4567`）

### 建置生產版本

```bash
npm run build
```

建置完成的檔案會輸出到 `dist` 目錄，可直接部署到任何靜態網站託管服務。

### 預覽生產版本

```bash
npm run preview
```

### 更新筆順資料

如需重新下載 KanjiVG 筆順資料：

```bash
node scripts/fetch-kanjivg-kana.cjs
```

## Google 登入與雲端同步

這是選用功能。沒有填入下方環境變數時，網站只把進度存在瀏覽器的 localStorage，行為與之前相同。

同步使用 Firebase Authentication 的 Google 登入，以及 Cloud Firestore。兩者都可留在 **Spark 免費方案**，不需要啟用付費的 Blaze 方案。網頁設定裡的 API key 會出現在建置後的程式中，這是 Firebase 網頁應用程式的正常做法；誰能讀寫進度，是由登入狀態與 `firestore.rules` 決定。進度文件放在 `users/{uid}/progress/state`，路徑上的 uid 就足以對應帳號，文件裡不會存放 email。

### 站長設定

1. 到 [Firebase Console](https://console.firebase.google.com/) 建立專案，並確認方案為 Spark。
2. 新增網頁應用程式，複製它的設定值。
3. 在 Authentication → Sign-in method 啟用 **Google**。
4. 在 Authentication → Settings → Authorized domains 加入：
   - `localhost`（本機開發；Firebase 通常已預設加入）
   - `japanese-practice-henna.vercel.app`
   - 若預覽網址也要能登入，再加入該 Vercel 預覽網域
5. 建立 Cloud Firestore。建立時選正式模式，不要用會暫時開放所有人讀寫的測試模式。
6. 部署本專案的 `firestore.rules`。可以在 Firestore → Rules 貼上檔案內容後發布，或在已登入 Firebase CLI 的情況下執行：

```bash
npx firebase-tools deploy --only firestore:rules
```

7. 在本機把 `.env.example` 複製成 `.env.local` 並填入值。在 Vercel 專案的 Environment Variables 設定同樣的名稱（Production 要設；Preview 若要登入也要設）：
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
8. 重新部署 Vercel。Vite 會在建置時寫入這些變數，只改了 Vercel 設定而沒有重新部署時，正式站不會開始同步。

登入後，只有一邊有進度時會採用那一邊並寫回本機與雲端。兩邊都有時會合併：假名保留較高的練習次數與較晚的時間，已解鎖的學習路徑不會上鎖，經驗值與等級不會倒退。細節見 [更新日誌](./CHANGELOG.md)。

## 使用說明

1. **選擇假名類型**：在頂部選擇「平假名」或「片假名」
2. **字母表模式**：
   - 瀏覽所有字符
   - 點擊任何字符查看讀音、聽發音和查看筆順
   - 使用篩選按鈕只顯示特定類型
3. **測驗模式**：
   - 選擇測驗方向和練習範圍
   - 勾選要練習的行段
   - 開始測驗並選擇正確答案
   - 查看即時回饋和最終成績
4. **複習模式**：
   - 查看今日待複習字符數量
   - 進行間隔重複複習
   - 系統自動調整複習間隔
5. **手寫練習**：
   - 選擇要練習的行段
   - 在畫布上書寫假名
   - 查看筆順動畫演示
   - 自我評分以改進學習效果
6. **進度追蹤**：
   - 查看整體統計數據
   - 檢視各字符的詳細表現
   - 識別需要加強的弱項

## 授權

MIT License

筆順資料來自 KanjiVG (CC BY-SA 3.0)

## 貢獻

歡迎提交 Issue 和 Pull Request！
