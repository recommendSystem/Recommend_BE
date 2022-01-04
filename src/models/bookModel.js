import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  score: { type: Number, required: true },
  review_num: { type: Number, required: true },
  keyword: [{ type: String, trim: true }],
  category: { type: String, required: true },
  tokenized_keyword: [{ type: String, trim: true }],
});

const bookModel = mongoose.model("Book", bookSchema);
export default bookModel;
