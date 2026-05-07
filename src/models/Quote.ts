import {
  Schema,
  model,
  models,
  type Document,
  type Model,
} from "mongoose";

/**
 * MongoDB に保存する名言ドキュメントの TypeScript 型です。
 */
export interface QuoteDocument extends Document {
  /** ユーザーが入力した名言生成のテーマです。 */
  theme: string;
  /** Codex App Server で生成した名言本文です。 */
  quote: string;
  /** 名言の語り手として表示する架空の著者名です。 */
  author?: string;
  /** MongoDB へ保存された日時です。 */
  createdAt: Date;
}

/**
 * 名言を MongoDB に保存するための Mongoose スキーマです。
 */
const QuoteSchema = new Schema<QuoteDocument>(
  {
    theme: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      minlength: 1,
    },
    quote: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
      minlength: 1,
    },
    author: {
      type: String,
      trim: true,
      default: "Unknown",
      maxlength: 80,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

/**
 * Next.js のホットリロード時に同じモデルを二重登録しないため、
 * 既存の `models.Quote` があれば再利用する Mongoose モデルです。
 */
const Quote =
  (models.Quote as Model<QuoteDocument> | undefined) ??
  model<QuoteDocument>("Quote", QuoteSchema);

export default Quote;
