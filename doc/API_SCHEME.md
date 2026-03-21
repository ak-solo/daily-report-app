# 営業日報システム API仕様書

## 目次

1. [共通仕様](#1-共通仕様)
2. [認証 API](#2-認証-api)
3. [日報 API](#3-日報-api)
4. [訪問記録 API](#4-訪問記録-api)
5. [コメント API](#5-コメント-api)
6. [顧客マスタ API](#6-顧客マスタ-api)
7. [ユーザーマスタ API](#7-ユーザーマスタ-api)
8. [エラーレスポンス一覧](#8-エラーレスポンス一覧)

---

## 1. 共通仕様

### ベースURL

```
https://api.example.com/v1
```

### リクエスト形式

- Content-Type: `application/json`
- 文字コード: `UTF-8`

### 認証

ログイン後に発行されるJWTトークンを `Authorization` ヘッダーに付与する。  
認証が必要なエンドポイントには 🔒 マークを付記する。

```
Authorization: Bearer <token>
```

### ページネーション

一覧系APIはクエリパラメータでページネーションを指定する。

| パラメータ | 型 | デフォルト | 説明 |
|------------|-----|-----------|------|
| `page` | integer | 1 | ページ番号（1始まり） |
| `per_page` | integer | 20 | 1ページあたりの件数（最大100） |

レスポンスには以下のメタ情報を含む。

```json
{
  "data": [...],
  "meta": {
    "total": 53,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

### 日時フォーマット

ISO 8601形式（UTC）を使用する。

```
2024-01-15T09:00:00Z
```

### ロール定義

| 値 | 説明 |
|----|------|
| `sales` | 営業担当者 |
| `manager` | 上長 |
| `admin` | 管理者 |

---

## 2. 認証 API

### POST /auth/login

ログイン。メールアドレスとパスワードで認証し、JWTトークンを発行する。

**リクエスト**

```json
{
  "email": "yamada@example.com",
  "password": "password123"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| `email` | string | ○ | メールアドレス |
| `password` | string | ○ | パスワード |

**レスポンス** `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "role": "sales"
  }
}
```

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `401` | `INVALID_CREDENTIALS` | メールアドレスまたはパスワードが不正 |

---

### POST /auth/logout 🔒

ログアウト。サーバー側でトークンを無効化する。

**リクエスト**

なし

**レスポンス** `204 No Content`

---

### GET /auth/me 🔒

ログイン中のユーザー情報を取得する。

**レスポンス** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "山田 太郎",
  "email": "yamada@example.com",
  "role": "sales",
  "manager": {
    "id": "661f9511-f30c-52e5-b827-557766551111",
    "name": "鈴木 一郎"
  }
}
```

---

## 3. 日報 API

### GET /reports 🔒

日報一覧を取得する。ロールによって取得範囲が異なる。

- `sales`：自分の日報のみ
- `manager`：自分と部下全員の日報
- `admin`：全ユーザーの日報

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `user_id` | string (UUID) | - | 担当者で絞り込み（manager / admin のみ使用可） |
| `from` | string (date) | - | 期間開始日（例: `2024-01-01`） |
| `to` | string (date) | - | 期間終了日（例: `2024-01-31`） |
| `page` | integer | - | ページ番号 |
| `per_page` | integer | - | 1ページあたりの件数 |

**レスポンス** `200 OK`

```json
{
  "data": [
    {
      "id": "770fa622-g41d-63f6-c938-668877662222",
      "report_date": "2024-01-15",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "山田 太郎"
      },
      "visit_count": 3,
      "has_comment": true,
      "created_at": "2024-01-15T18:00:00Z",
      "updated_at": "2024-01-15T18:00:00Z"
    }
  ],
  "meta": {
    "total": 53,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

---

### POST /reports 🔒

日報を新規作成する。`sales` ロールのみ利用可能。  
同一ユーザー・同一日付の日報が既に存在する場合はエラーを返す。

**リクエスト**

```json
{
  "report_date": "2024-01-15",
  "problem": "ABC社の価格交渉が難航している。上長への相談が必要。",
  "plan": "ABC社向けに代替プランの資料を作成する。",
  "visit_records": [
    {
      "customer_id": "aa1b2c3d-0001-0001-0001-000000000001",
      "visit_note": "新製品の提案を実施。先方の反応は良好。",
      "visit_order": 1
    },
    {
      "customer_id": "aa1b2c3d-0002-0002-0002-000000000002",
      "visit_note": "契約更新の確認。来週再訪予定。",
      "visit_order": 2
    }
  ]
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| `report_date` | string (date) | ○ | 報告日（当日のみ） |
| `problem` | string | ○ | 課題・相談 |
| `plan` | string | ○ | 明日やること |
| `visit_records` | array | ○ | 訪問記録（1件以上） |
| `visit_records[].customer_id` | string (UUID) | ○ | 顧客ID |
| `visit_records[].visit_note` | string | ○ | 訪問内容 |
| `visit_records[].visit_order` | integer | ○ | 表示順（1始まり） |

**レスポンス** `201 Created`

```json
{
  "id": "770fa622-g41d-63f6-c938-668877662222",
  "report_date": "2024-01-15",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "山田 太郎"
  },
  "problem": "ABC社の価格交渉が難航している。上長への相談が必要。",
  "plan": "ABC社向けに代替プランの資料を作成する。",
  "visit_records": [
    {
      "id": "bb2c3d4e-0001-0001-0001-000000000001",
      "customer": {
        "id": "aa1b2c3d-0001-0001-0001-000000000001",
        "name": "株式会社ABC"
      },
      "visit_note": "新製品の提案を実施。先方の反応は良好。",
      "visit_order": 1
    }
  ],
  "manager_comment": null,
  "commented_by": null,
  "commented_at": null,
  "created_at": "2024-01-15T18:00:00Z",
  "updated_at": "2024-01-15T18:00:00Z"
}
```

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `403` | `FORBIDDEN` | salesロール以外がアクセス |
| `409` | `REPORT_ALREADY_EXISTS` | 同一ユーザー・同一日付の日報が既に存在する |
| `422` | `VALIDATION_ERROR` | 入力値不正 |

---

### GET /reports/:id 🔒

日報の詳細を取得する。他ユーザーの日報は上長・管理者のみ取得可能。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `id` | string (UUID) | 日報ID |

**レスポンス** `200 OK`

```json
{
  "id": "770fa622-g41d-63f6-c938-668877662222",
  "report_date": "2024-01-15",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "山田 太郎"
  },
  "problem": "ABC社の価格交渉が難航している。上長への相談が必要。",
  "plan": "ABC社向けに代替プランの資料を作成する。",
  "visit_records": [
    {
      "id": "bb2c3d4e-0001-0001-0001-000000000001",
      "customer": {
        "id": "aa1b2c3d-0001-0001-0001-000000000001",
        "name": "株式会社ABC"
      },
      "visit_note": "新製品の提案を実施。先方の反応は良好。",
      "visit_order": 1
    },
    {
      "id": "bb2c3d4e-0002-0002-0002-000000000002",
      "customer": {
        "id": "aa1b2c3d-0002-0002-0002-000000000002",
        "name": "有限会社XYZ"
      },
      "visit_note": "契約更新の確認。来週再訪予定。",
      "visit_order": 2
    }
  ],
  "manager_comment": "ABC社については先方の予算期が3月なので、焦らず来週再提案する方針で進めてください。",
  "commented_by": {
    "id": "661f9511-f30c-52e5-b827-557766551111",
    "name": "鈴木 一郎"
  },
  "commented_at": "2024-01-15T19:30:00Z",
  "created_at": "2024-01-15T18:00:00Z",
  "updated_at": "2024-01-15T18:00:00Z"
}
```

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `403` | `FORBIDDEN` | 他ユーザーの日報にsalesがアクセス |
| `404` | `NOT_FOUND` | 日報が存在しない |

---

### PUT /reports/:id 🔒

日報を更新する。自分が作成した日報のみ更新可能（`sales` ロール）。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `id` | string (UUID) | 日報ID |

**リクエスト**

POST /reports と同一スキーマ。`report_date` は変更不可。

```json
{
  "problem": "（更新後の内容）",
  "plan": "（更新後の内容）",
  "visit_records": [
    {
      "customer_id": "aa1b2c3d-0001-0001-0001-000000000001",
      "visit_note": "（更新後の内容）",
      "visit_order": 1
    }
  ]
}
```

> `visit_records` は差分更新ではなく全件置き換えとする。リクエストに含まれない既存レコードは削除される。

**レスポンス** `200 OK`

GET /reports/:id と同一スキーマ。

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `403` | `FORBIDDEN` | 自分の日報以外、またはsales以外がアクセス |
| `404` | `NOT_FOUND` | 日報が存在しない |
| `422` | `VALIDATION_ERROR` | 入力値不正 |

---

## 4. 訪問記録 API

訪問記録は日報API（POST /reports・PUT /reports/:id）の `visit_records` フィールドで一括管理するため、単独のCRUDエンドポイントは提供しない。

---

## 5. コメント API

### PUT /reports/:id/comment 🔒

日報に上長コメントを登録・更新する。`manager` および `admin` ロールのみ利用可能。  
コメントは1日報につき1件のみ。既存コメントがある場合は上書きする。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `id` | string (UUID) | 日報ID |

**リクエスト**

```json
{
  "body": "ABC社については先方の予算期が3月なので、焦らず来週再提案する方針で進めてください。"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| `body` | string | ○ | コメント本文（1文字以上） |

**レスポンス** `200 OK`

```json
{
  "manager_comment": "ABC社については先方の予算期が3月なので、焦らず来週再提案する方針で進めてください。",
  "commented_by": {
    "id": "661f9511-f30c-52e5-b827-557766551111",
    "name": "鈴木 一郎"
  },
  "commented_at": "2024-01-15T19:30:00Z"
}
```

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `403` | `FORBIDDEN` | salesロールがアクセス |
| `404` | `NOT_FOUND` | 日報が存在しない |
| `422` | `VALIDATION_ERROR` | 入力値不正 |

---

## 6. 顧客マスタ API

### GET /customers 🔒

顧客一覧を取得する。全ロールが利用可能（日報作成時のセレクトボックス用途を含む）。

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `name` | string | - | 顧客名で部分一致検索 |
| `assigned_user_id` | string (UUID) | - | 担当営業で絞り込み |
| `page` | integer | - | ページ番号 |
| `per_page` | integer | - | 1ページあたりの件数 |

**レスポンス** `200 OK`

```json
{
  "data": [
    {
      "id": "aa1b2c3d-0001-0001-0001-000000000001",
      "name": "株式会社ABC",
      "industry": "製造業",
      "assigned_user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "山田 太郎"
      },
      "created_at": "2023-04-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "per_page": 20,
    "total_pages": 2
  }
}
```

---

### POST /customers 🔒

顧客を新規登録する。`admin` ロールのみ利用可能。

**リクエスト**

```json
{
  "name": "株式会社ABC",
  "industry": "製造業",
  "assigned_user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| `name` | string | ○ | 顧客名（100文字以内） |
| `industry` | string | - | 業種（100文字以内） |
| `assigned_user_id` | string (UUID) | - | 担当営業のユーザーID |

**レスポンス** `201 Created`

```json
{
  "id": "aa1b2c3d-0001-0001-0001-000000000001",
  "name": "株式会社ABC",
  "industry": "製造業",
  "assigned_user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "山田 太郎"
  },
  "created_at": "2024-01-15T10:00:00Z"
}
```

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `403` | `FORBIDDEN` | admin以外がアクセス |
| `422` | `VALIDATION_ERROR` | 入力値不正 |

---

### GET /customers/:id 🔒

顧客の詳細を取得する。全ロールが利用可能。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `id` | string (UUID) | 顧客ID |

**レスポンス** `200 OK`

POST /customers のレスポンスと同一スキーマ。

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `404` | `NOT_FOUND` | 顧客が存在しない |

---

### PUT /customers/:id 🔒

顧客情報を更新する。`admin` ロールのみ利用可能。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `id` | string (UUID) | 顧客ID |

**リクエスト**

POST /customers と同一スキーマ。

**レスポンス** `200 OK`

POST /customers のレスポンスと同一スキーマ。

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `403` | `FORBIDDEN` | admin以外がアクセス |
| `404` | `NOT_FOUND` | 顧客が存在しない |
| `422` | `VALIDATION_ERROR` | 入力値不正 |

---

### DELETE /customers/:id 🔒

顧客を削除する。`admin` ロールのみ利用可能。  
訪問記録に紐付いている顧客は削除不可。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `id` | string (UUID) | 顧客ID |

**レスポンス** `204 No Content`

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `403` | `FORBIDDEN` | admin以外がアクセス |
| `404` | `NOT_FOUND` | 顧客が存在しない |
| `409` | `CUSTOMER_IN_USE` | 訪問記録に紐付いているため削除不可 |

---

## 7. ユーザーマスタ API

### GET /users 🔒

ユーザー一覧を取得する。ロールによって取得範囲が異なる。

- `sales` / `manager`：上長・部下の関係にあるユーザーのみ（日報作成時のセレクトボックス用途を含む）
- `admin`：全ユーザー

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `name` | string | - | 氏名で部分一致検索 |
| `role` | string | - | ロールで絞り込み（`sales` / `manager` / `admin`） |
| `page` | integer | - | ページ番号 |
| `per_page` | integer | - | 1ページあたりの件数 |

**レスポンス** `200 OK`

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "山田 太郎",
      "email": "yamada@example.com",
      "role": "sales",
      "manager": {
        "id": "661f9511-f30c-52e5-b827-557766551111",
        "name": "鈴木 一郎"
      },
      "created_at": "2023-04-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

---

### POST /users 🔒

ユーザーを新規登録する。`admin` ロールのみ利用可能。

**リクエスト**

```json
{
  "name": "山田 太郎",
  "email": "yamada@example.com",
  "password": "password123",
  "role": "sales",
  "manager_id": "661f9511-f30c-52e5-b827-557766551111"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| `name` | string | ○ | 氏名（50文字以内） |
| `email` | string | ○ | メールアドレス（システム内で一意） |
| `password` | string | ○ | パスワード（8文字以上） |
| `role` | string | ○ | ロール（`sales` / `manager` / `admin`） |
| `manager_id` | string (UUID) | - | 上長のユーザーID |

**レスポンス** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "山田 太郎",
  "email": "yamada@example.com",
  "role": "sales",
  "manager": {
    "id": "661f9511-f30c-52e5-b827-557766551111",
    "name": "鈴木 一郎"
  },
  "created_at": "2024-01-15T10:00:00Z"
}
```

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `403` | `FORBIDDEN` | admin以外がアクセス |
| `409` | `EMAIL_ALREADY_EXISTS` | メールアドレスが既に使用されている |
| `422` | `VALIDATION_ERROR` | 入力値不正 |

---

### GET /users/:id 🔒

ユーザーの詳細を取得する。`admin` ロールのみ利用可能（自分自身は GET /auth/me で取得）。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `id` | string (UUID) | ユーザーID |

**レスポンス** `200 OK`

POST /users のレスポンスと同一スキーマ。

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `403` | `FORBIDDEN` | admin以外がアクセス |
| `404` | `NOT_FOUND` | ユーザーが存在しない |

---

### PUT /users/:id 🔒

ユーザー情報を更新する。`admin` ロールのみ利用可能。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `id` | string (UUID) | ユーザーID |

**リクエスト**

POST /users と同一スキーマ。`password` は省略可（省略時は変更しない）。

**レスポンス** `200 OK`

POST /users のレスポンスと同一スキーマ。

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `403` | `FORBIDDEN` | admin以外がアクセス |
| `404` | `NOT_FOUND` | ユーザーが存在しない |
| `409` | `EMAIL_ALREADY_EXISTS` | メールアドレスが既に使用されている |
| `422` | `VALIDATION_ERROR` | 入力値不正 |

---

### DELETE /users/:id 🔒

ユーザーを削除する。`admin` ロールのみ利用可能。  
日報が存在するユーザーは削除不可。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `id` | string (UUID) | ユーザーID |

**レスポンス** `204 No Content`

**エラー**

| ステータス | コード | 説明 |
|-----------|--------|------|
| `403` | `FORBIDDEN` | admin以外がアクセス |
| `404` | `NOT_FOUND` | ユーザーが存在しない |
| `409` | `USER_IN_USE` | 日報が存在するため削除不可 |

---

## 8. エラーレスポンス一覧

### エラーレスポンス形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値に誤りがあります。",
    "details": [
      {
        "field": "problem",
        "message": "課題・相談は必須です。"
      }
    ]
  }
}
```

| フィールド | 型 | 説明 |
|------------|----|------|
| `code` | string | エラーコード |
| `message` | string | エラーの概要 |
| `details` | array | バリデーションエラー時の詳細（省略可） |
| `details[].field` | string | エラーが発生したフィールド名 |
| `details[].message` | string | フィールドごとのエラーメッセージ |

### エラーコード一覧

| HTTPステータス | コード | 説明 |
|---------------|--------|------|
| `400` | `BAD_REQUEST` | リクエスト形式が不正 |
| `401` | `UNAUTHORIZED` | 未認証（トークン未設定または期限切れ） |
| `401` | `INVALID_CREDENTIALS` | ログイン情報が不正 |
| `403` | `FORBIDDEN` | 権限なし |
| `404` | `NOT_FOUND` | リソースが存在しない |
| `409` | `REPORT_ALREADY_EXISTS` | 同一日付の日報が既に存在する |
| `409` | `EMAIL_ALREADY_EXISTS` | メールアドレスが既に使用されている |
| `409` | `CUSTOMER_IN_USE` | 訪問記録に紐付いているため顧客削除不可 |
| `409` | `USER_IN_USE` | 日報が存在するためユーザー削除不可 |
| `422` | `VALIDATION_ERROR` | 入力値バリデーションエラー |
| `500` | `INTERNAL_SERVER_ERROR` | サーバー内部エラー |

---

## エンドポイント一覧

| メソッド | エンドポイント | 説明 | 利用ロール |
|---------|----------------|------|-----------|
| POST | `/auth/login` | ログイン | 全員 |
| POST | `/auth/logout` | ログアウト | 全員 |
| GET | `/auth/me` | ログインユーザー情報取得 | 全員 |
| GET | `/reports` | 日報一覧 | 全員 |
| POST | `/reports` | 日報作成 | sales |
| GET | `/reports/:id` | 日報詳細 | 全員 |
| PUT | `/reports/:id` | 日報更新 | sales（自分のみ） |
| PUT | `/reports/:id/comment` | コメント登録・更新 | manager / admin |
| GET | `/customers` | 顧客一覧 | 全員 |
| POST | `/customers` | 顧客作成 | admin |
| GET | `/customers/:id` | 顧客詳細 | 全員 |
| PUT | `/customers/:id` | 顧客更新 | admin |
| DELETE | `/customers/:id` | 顧客削除 | admin |
| GET | `/users` | ユーザー一覧 | 全員 |
| POST | `/users` | ユーザー作成 | admin |
| GET | `/users/:id` | ユーザー詳細 | admin |
| PUT | `/users/:id` | ユーザー更新 | admin |
| DELETE | `/users/:id` | ユーザー削除 | admin |

---

*最終更新：2024年1月*
