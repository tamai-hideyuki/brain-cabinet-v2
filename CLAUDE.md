# Brain Cabinet v2

## 哲学: Decision Mirror

思考を代行しない。判断を誘導しない。ただ映す。
Brain Cabinet v2は「自分の判断力が育つ道具」。日記でもTODOでもナレッジベースでもない。

## 三要件（ループ）

```
写す → 検知 → 修正 → 再び写す
```

| 要件 | 機能 | なぜ必要か |
|------|------|-----------|
| 写す | Note Type Inference + Confidence Detail | 信号がなければ下流は動かない |
| 検知 | Drift Detection | 鏡が黙ると壁掛けの絵と同じ |
| 修正 | Spaced Review（SM-2） | 気づいても変わらなければループは閉じない |

## 技術構成

| レイヤー | 技術 |
|---------|------|
| API | Hono (Node.js) |
| DB | SQLite (better-sqlite3) + Drizzle ORM — data/brain-cabinet.db |
| Embedding | MiniLM (@xenova/transformers) 384次元・完全ローカル |
| フロント | React (Vite) |
| ジョブ | node-cron |
| 公開 | Cloudflare Tunnel |

**外部AI依存: ゼロ**

## プロジェクト構造

```
src/
├── index.ts              # サーバーエントリ (Hono + cron起動)
├── db/
│   ├── schema.ts         # 5テーブル定義 (Drizzle ORM)
│   └── client.ts         # SQLite接続 (data/brain-cabinet.db)
├── routes/
│   └── command.ts        # POST /api/v1 Command API
├── dispatchers/
│   ├── note.ts           # note.create / note.get / note.list / note.search
│   ├── drift.ts          # drift.compute / drift.list / drift.acknowledge
│   └── review.ts         # review.next / review.submit
├── services/
│   ├── note/index.ts     # ノートCRUD + セマンティック検索
│   ├── embedding/index.ts # MiniLM embedding生成
│   ├── inference/index.ts # ノートタイプ推論 + 確信度算出
│   ├── drift/index.ts    # ドリフト検出ロジック
│   └── review/index.ts   # SM-2スケジューリング
└── cron/index.ts         # バックグラウンドジョブ

ui/
├── src/
│   ├── App.tsx           # ルーティング
│   ├── api/client.ts     # Command APIクライアント
│   └── pages/
│       ├── NotesPage.tsx  # 書く・見る・検索する
│       ├── ReviewPage.tsx # 過去の判断と再会する
│       └── DriftPage.tsx  # 思考の異変を見る
```

## データベース（5テーブル）

| テーブル | 層 | 目的 |
|---------|-----|------|
| notes | 写す | メモ本体 + 自動推論結果 (type, confidence, decay_profile) |
| note_embeddings | 写す | MiniLM 384次元ベクトル (JSON文字列で保存、アプリ側でコサイン類似度計算) |
| drift_events | 検知 | 検出されたドリフトイベント |
| review_schedules | 修正 | SM-2パラメータ + 次回レビュー日 |
| review_sessions | 修正 | レビュー実績 (quality + response) |

## API（9アクション）

すべて `POST /api/v1` に `{ action, payload }` で送る。

### 写す
- `note.create` — 保存→Embedding生成→型推論+確信度算出→DB書き込み
- `note.get` — 単一ノート取得
- `note.list` — 一覧取得（フィルタ・ページネーション）
- `note.search` — セマンティック検索

### 検知
- `drift.compute` — 直近N日のEmbedding集計→ドリフト検出
- `drift.list` — 検出済みドリフト一覧
- `drift.acknowledge` — 確認済みマーク

### 修正
- `review.next` — レビュー対象ノート抽出
- `review.submit` — quality保存→SM-2再計算→（responseあれば新ノート作成→ループ再開）

## 開発コマンド

```bash
# 初回セットアップ
npm install && cd ui && npm install && cd ..

# DB マイグレーション
npm run db:generate  # drizzle-kit generate
npm run db:migrate   # drizzle-kit migrate (data/brain-cabinet.db に作成)

# 起動（バックエンド:3000 + フロントエンド:5173 同時起動）
npm run dev

# Cloudflare Tunnel
cloudflared tunnel run brain-cabinet
```

## 設計原則

1. **「これがないとループが回らない」だけを残す** — 機能追加は三要件のどれかを強化するものだけ
2. **外部AI依存ゼロ** — Embedding含めすべてローカル処理
3. **Command APIパターン** — 単一エンドポイント `POST /api/v1 { action, payload }`
4. **v1からの移植** — 推論ルール (inferNoteType)、SM-2アルゴリズムはv1のドメインロジックを移植
5. **SQLiteで始めてスケール時にPostgreSQL+pgvectorへ移行** — サービス層は変わらない

## v1との関係

v1 (brain-cabinet) の哲学とドメインロジックを継承し、基盤を5テーブル+9アクションでゼロから再構築。
v1の38テーブル・100+アクションから93%削減。

## スケールロードマップ（必要になったら追加）

| トリガー | 追加 |
|---------|------|
| ユーザー増 | Clerk認証 + RLS |
| ベクトル検索高速化 | sqlite-vec or PostgreSQL+pgvector |
| ノート1万超 | K-Meansクラスタリング |
| 判断の質向上 | 反証記録テーブル |
| 思考の系譜 | 影響ネットワーク |
| 深い内省 | コーチング4フェーズ |
| 可視化 | グラフ・タイムライン |
