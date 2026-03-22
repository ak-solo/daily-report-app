import { describe, it, expect } from "vitest";
import {
  VisitRecordInputSchema,
  CreateReportRequestSchema,
  UpdateReportRequestSchema,
  ReportDetailSchema,
  ReportListQuerySchema,
  CommentRequestSchema,
  CommentResponseSchema,
} from "./reports";

// Zod v4 は RFC 4122 準拠の UUID を要求するため、テストデータも正規の UUID を使用する
const CUSTOMER_ID_1 = "aa1b2c3d-1001-4001-8001-000000000001";
const CUSTOMER_ID_2 = "bb2c3d4e-2002-4002-8002-000000000002";
const USER_ID_1 = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID_2 = "661f9511-f30c-42e5-b827-557766551111";
const REPORT_ID = "770fa622-741d-43f6-8938-668877662222";
const VISIT_RECORD_ID_1 = "bb2c3d4e-0001-4001-8001-000000000001";

const validVisitRecord = {
  customer_id: CUSTOMER_ID_1,
  visit_note: "新製品の提案を実施。",
  visit_order: 1,
};

describe("VisitRecordInputSchema", () => {
  it("正常な訪問記録を受け入れる", () => {
    const result = VisitRecordInputSchema.parse(validVisitRecord);
    expect(result.visit_order).toBe(1);
  });

  it("customer_id が UUID 形式でない場合を拒否する", () => {
    expect(() =>
      VisitRecordInputSchema.parse({ ...validVisitRecord, customer_id: "not-uuid" })
    ).toThrow();
  });

  it("visit_note が空の場合を拒否する", () => {
    expect(() =>
      VisitRecordInputSchema.parse({ ...validVisitRecord, visit_note: "" })
    ).toThrow();
  });

  it("visit_order が 0 の場合を拒否する", () => {
    expect(() =>
      VisitRecordInputSchema.parse({ ...validVisitRecord, visit_order: 0 })
    ).toThrow();
  });
});

describe("CreateReportRequestSchema", () => {
  const validRequest = {
    report_date: "2024-01-15",
    problem: "ABC社の価格交渉が難航している。",
    plan: "代替プランの資料を作成する。",
    visit_records: [validVisitRecord],
  };

  it("正常なリクエストを受け入れる", () => {
    const result = CreateReportRequestSchema.parse(validRequest);
    expect(result.report_date).toBe("2024-01-15");
    expect(result.visit_records).toHaveLength(1);
  });

  it("report_date の形式が YYYY-MM-DD でない場合を拒否する", () => {
    expect(() =>
      CreateReportRequestSchema.parse({ ...validRequest, report_date: "2024/01/15" })
    ).toThrow();
    expect(() =>
      CreateReportRequestSchema.parse({ ...validRequest, report_date: "20240115" })
    ).toThrow();
  });

  it("problem が空の場合を拒否する", () => {
    expect(() =>
      CreateReportRequestSchema.parse({ ...validRequest, problem: "" })
    ).toThrow();
  });

  it("plan が空の場合を拒否する", () => {
    expect(() =>
      CreateReportRequestSchema.parse({ ...validRequest, plan: "" })
    ).toThrow();
  });

  it("visit_records が空配列の場合を拒否する", () => {
    expect(() =>
      CreateReportRequestSchema.parse({ ...validRequest, visit_records: [] })
    ).toThrow();
  });

  it("visit_records が複数件の場合を受け入れる", () => {
    const result = CreateReportRequestSchema.parse({
      ...validRequest,
      visit_records: [
        validVisitRecord,
        { customer_id: CUSTOMER_ID_2, visit_note: "契約更新の確認。", visit_order: 2 },
      ],
    });
    expect(result.visit_records).toHaveLength(2);
  });
});

describe("UpdateReportRequestSchema", () => {
  const validUpdate = {
    problem: "更新後の課題",
    plan: "更新後のプラン",
    visit_records: [validVisitRecord],
  };

  it("report_date なしで受け入れる（変更不可）", () => {
    const result = UpdateReportRequestSchema.parse(validUpdate);
    expect(result.problem).toBe("更新後の課題");
    // report_date フィールドはスキーマに存在しない
    expect("report_date" in result).toBe(false);
  });

  it("report_date を含めても無視される（stripされる）", () => {
    const result = UpdateReportRequestSchema.parse({
      ...validUpdate,
      report_date: "2024-01-15",
    });
    expect("report_date" in result).toBe(false);
  });

  it("visit_records が空配列の場合を拒否する", () => {
    expect(() =>
      UpdateReportRequestSchema.parse({ ...validUpdate, visit_records: [] })
    ).toThrow();
  });
});

describe("ReportDetailSchema", () => {
  it("コメントありの日報詳細を受け入れる", () => {
    const result = ReportDetailSchema.parse({
      id: REPORT_ID,
      report_date: "2024-01-15",
      user: { id: USER_ID_1, name: "山田 太郎" },
      problem: "ABC社の価格交渉が難航している。",
      plan: "代替プランの資料を作成する。",
      visit_records: [
        {
          id: VISIT_RECORD_ID_1,
          customer: { id: CUSTOMER_ID_1, name: "株式会社ABC" },
          visit_note: "新製品の提案を実施。",
          visit_order: 1,
        },
      ],
      manager_comment: "焦らず来週再提案する方針で進めてください。",
      commented_by: { id: USER_ID_2, name: "鈴木 一郎" },
      commented_at: "2024-01-15T19:30:00Z",
      created_at: "2024-01-15T18:00:00Z",
      updated_at: "2024-01-15T18:00:00Z",
    });
    expect(result.manager_comment).toBeTruthy();
    expect(result.commented_by?.name).toBe("鈴木 一郎");
  });

  it("コメントなしの日報詳細を受け入れる（null）", () => {
    const result = ReportDetailSchema.parse({
      id: REPORT_ID,
      report_date: "2024-01-15",
      user: { id: USER_ID_1, name: "山田 太郎" },
      problem: "課題",
      plan: "プラン",
      visit_records: [],
      manager_comment: null,
      commented_by: null,
      commented_at: null,
      created_at: "2024-01-15T18:00:00Z",
      updated_at: "2024-01-15T18:00:00Z",
    });
    expect(result.manager_comment).toBeNull();
    expect(result.commented_by).toBeNull();
  });
});

describe("ReportListQuerySchema", () => {
  it("全パラメータを受け入れる", () => {
    const result = ReportListQuerySchema.parse({
      user_id: USER_ID_1,
      from: "2024-01-01",
      to: "2024-01-31",
      page: "1",
      per_page: "20",
    });
    expect(result.from).toBe("2024-01-01");
    expect(result.page).toBe(1);
  });

  it("全パラメータ省略で受け入れる（デフォルト適用）", () => {
    const result = ReportListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(20);
    expect(result.user_id).toBeUndefined();
  });

  it("from の形式が不正な場合を拒否する", () => {
    expect(() => ReportListQuerySchema.parse({ from: "2024/01/01" })).toThrow();
  });
});

describe("CommentRequestSchema", () => {
  it("正常なコメントを受け入れる", () => {
    const result = CommentRequestSchema.parse({ body: "焦らず来週再提案する方針で。" });
    expect(result.body).toBe("焦らず来週再提案する方針で。");
  });

  it("body が空文字の場合を拒否する", () => {
    expect(() => CommentRequestSchema.parse({ body: "" })).toThrow();
  });

  it("body が未定義の場合を拒否する", () => {
    expect(() => CommentRequestSchema.parse({})).toThrow();
  });
});

describe("CommentResponseSchema", () => {
  it("正常なコメントレスポンスを受け入れる", () => {
    const result = CommentResponseSchema.parse({
      manager_comment: "焦らず来週再提案する方針で。",
      commented_by: { id: USER_ID_2, name: "鈴木 一郎" },
      commented_at: "2024-01-15T19:30:00Z",
    });
    expect(result.commented_by.name).toBe("鈴木 一郎");
  });
});
