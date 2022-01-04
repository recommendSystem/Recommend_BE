import bcrypt from "bcrypt";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  ID: { type: String, required: true, unique: true },
  password: { type: String },
  history: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
});

// eslint-disable-next-line func-names
userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 5);
  }
});

const userModel = mongoose.model("User", userSchema);
export default userModel;
