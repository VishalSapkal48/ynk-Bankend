import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  mobile: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  branch: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
