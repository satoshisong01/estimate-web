# DB 스키마 검토 요약

## 1. 현재 테이블/컬럼 정리

### est_quotations (견적서)

| 컬럼              | 타입         | 비고                                         |
| ----------------- | ------------ | -------------------------------------------- |
| id                | integer PK   | 시퀀스                                       |
| user_id           | integer      | **코드에서 미사용** (editor_id만 사용)       |
| title             | varchar(200) |                                              |
| customer_name     | varchar(100) |                                              |
| customer_ref      | varchar(100) |                                              |
| quotation_date    | date         |                                              |
| total_amount      | numeric      |                                              |
| vat               | numeric      |                                              |
| grand_total       | numeric      |                                              |
| supplier_info     | jsonb        | **코드에서 미사용**                          |
| memo              | text         | tabConfig 등 JSON 저장                       |
| created_at        | timestamp    |                                              |
| updated_at        | timestamp    |                                              |
| image_layout      | text         |                                              |
| image_component   | text         |                                              |
| image_maintenance | text         |                                              |
| image_schedule    | text         |                                              |
| editor_id         | text         | **실제 사용** (est_users.id를 문자열로 저장) |

### est_quotation_items (견적 품목)

| 컬럼         | 타입         | 비고              |
| ------------ | ------------ | ----------------- |
| id           | integer PK   | 시퀀스            |
| quotation_id | integer      | 견적서 FK         |
| category     | varchar(50)  |                   |
| name         | varchar(100) |                   |
| spec         | varchar(100) |                   |
| unit         | varchar(20)  |                   |
| quantity     | numeric      |                   |
| unit_price   | numeric      |                   |
| supply_price | numeric      |                   |
| remarks      | varchar(200) |                   |
| sort_order   | integer      |                   |
| section      | varchar(20)  | 'main' / 'detail' |

### est_users (사용자)

| 컬럼        | 타입                  | 비고        |
| ----------- | --------------------- | ----------- |
| id          | integer PK            | 시퀀스      |
| email       | varchar(255) NOT NULL |             |
| name        | varchar(100)          |             |
| role        | varchar(20)           | 기본 'USER' |
| is_approved | boolean               | 기본 false  |
| created_at  | timestamp             |             |

---

## 2. 코드와의 정합성

- **editor_id**: 앱은 `editor_id`(text)만 사용하고, `est_users.id`를 문자열로 저장·조인하고 있음. ✅
- **user_id**: `est_quotations`에 있지만 코드에서 읽/쓰지 않음. → **미사용 컬럼**으로 보는 것이 맞음.
- **supplier_info**: 코드에서 사용하지 않음. → **미사용 컬럼** 또는 추후 활용 예정인지 정리 필요.

---

## 3. 데이터 쌓일 때를 위한 개선 제안

### 3-1. 인덱스 추가 (조회/정렬/조인 속도)

```sql
-- 견적서 목록: 최신순 정렬에 사용
CREATE INDEX IF NOT EXISTS idx_est_quotations_created_at
ON est_quotations(created_at DESC);

-- 수정자로 조회/조인
CREATE INDEX IF NOT EXISTS idx_est_quotations_editor_id
ON est_quotations(editor_id);

-- 품목은 항상 quotation_id로 조회
CREATE INDEX IF NOT EXISTS idx_est_quotation_items_quotation_id
ON est_quotation_items(quotation_id);

-- 로그인: email로 사용자 조회
CREATE UNIQUE INDEX IF NOT EXISTS idx_est_users_email
ON est_users(email);
```

### 3-2. FK 제약 (참조 무결성)

```sql
-- 견적서 → 사용자 (editor_id는 text라서 직접 FK는 어렵고, 앱에서만 관리 가능)
-- 품목 → 견적서
ALTER TABLE est_quotation_items
ADD CONSTRAINT fk_quotation_items_quotation
FOREIGN KEY (quotation_id) REFERENCES est_quotations(id) ON DELETE CASCADE;
```

- `ON DELETE CASCADE`: 견적서 삭제 시 해당 품목도 함께 삭제 (현재 API에서 품목 먼저 삭제 후 견적 삭제하고 있으므로, FK만 추가해도 동작은 맞음).

### 3-3. 미사용 컬럼 정리 (선택)

- **user_id**: 완전히 안 쓸 거라면 나중에 `ALTER TABLE est_quotations DROP COLUMN user_id;` 로 제거 검토.
- **supplier_info**: 계속 안 쓸 계획이면 동일하게 제거 검토. 나중에 공급자 정보 넣을 계획이면 그대로 두어도 됨.

---

## 4. 요약

| 항목                    | 상태                                        |
| ----------------------- | ------------------------------------------- |
| 견적서/품목/사용자 구조 | 목적에 맞게 잘 구성됨                       |
| editor_id vs user_id    | editor_id만 사용 중, user_id는 미사용       |
| supplier_info           | 미사용                                      |
| 인덱스                  | 위 4개 추가 시 목록·상세·로그인 성능에 유리 |
| FK                      | est_quotation_items → est_quotations 권장   |

원하면 위 인덱스/FK를 적용하는 마이그레이션 파일(예: `migrations/xxx.sql`) 형태로도 만들어 줄 수 있음.
