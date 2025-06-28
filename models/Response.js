import mongoose from "mongoose";

const responseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  formId: { type: String, required: true },
  language: { type: String, enum: ["en", "mr"], required: true },
  responses: [{
    questionId: String,
    questionText: String,
    answer: String,
    images: [String],
    videos: [String],
    isSubQuestion: Boolean,
    parentQuestionId: String,
  }],
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("Response", responseSchema);