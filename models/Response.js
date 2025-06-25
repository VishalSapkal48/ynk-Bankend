import mongoose from "mongoose";
const responseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: [true, "User ID is required"] },
  formId: { type: String, required: [true, "Form ID is required"] },
  language: { type: String, enum: ["en", "mr"], required: [true, "Language is required"] },
  responses: [
    {
      questionId: { type: String, required: [true, "Question ID is required"] },
      questionText: { type: String, required: [true, "Question text is required"] },
      answer: { type: String, required: [true, "Answer is required"] },
      images: [{ type: String }],
      videos: [{ type: String }],
    },
  ],
  submittedAt: { type: Date, default: Date.now }, // Ensure default is set
});

responseSchema.index({ formId: 1, userId: 1 });

const Response = mongoose.model("Response", responseSchema);
export default Response;