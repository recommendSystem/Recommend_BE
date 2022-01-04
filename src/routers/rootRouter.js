import express from "express";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import bookModel from "../models/bookModel.js";

const rootRouter = express.Router();
const THRESHOLD = 0.4;

const home = (req, res) => {
  return res.render("home", { pageTitle: "Home" });
};

const preprocessing = str => {
  const array = str
    .replaceAll("'", "")
    .replaceAll(" ", "")
    .replace("[", "")
    .replace("]", "")
    .split(",");
  return array;
};

const cosineSimilarity_book = (mybook, other) => {
  let allKeyword = [];
  const myKeyword = preprocessing(mybook.tokenized_keyword[0]);
  const otherKeyword = preprocessing(other.tokenized_keyword[0]);
  const totalKeyword = Array.from(new Set(myKeyword.concat(otherKeyword)));
  let myVector = [];
  let otherVector = [];
  for (let i = 0; i < totalKeyword.length; i++) {
    if (myKeyword.includes(totalKeyword[i])) {
      myVector.push(1);
    } else {
      myVector.push(0);
    }
    if (otherKeyword.includes(totalKeyword[i])) {
      otherVector.push(1);
    } else {
      otherVector.push(0);
    }
  }
  let mySum = 0;
  let otherSum = 0;
  myVector.forEach(value => (mySum += value));
  otherVector.forEach(value => (otherSum += value));
  const denominator = Math.sqrt(mySum * otherSum);
  let numerator = 0;
  for (let j = 0; j < myVector.length; j++) {
    numerator += myVector[j] * otherVector[j];
  }
  const score = numerator / denominator;
  return score;
};

const find_related_books = async keyword => {
  let books;
  try {
    books = await bookModel.find({
      title: {
        $regex: new RegExp(keyword, "i"),
      },
    });
  } catch (error) {
    console.log("Error 1");
    console.log(error);
  }
  return books;
};

const find_recommended_books_by_keyword = async books => {
  let result = [];
  let all = [];
  if (books.length != 0) {
    try {
      all = await bookModel.find({});
    } catch (error) {
      console.log("Error 2");
      console.log(error);
    }
    for (let i = 0; i < all.length; i++) {
      if (books[0].title === all[i].title) {
        continue;
      }
      let score = cosineSimilarity_book(books[0], all[i]);
      if (score >= THRESHOLD) {
        result.push(all[i]);
      }
    }
  }
  return result;
};

const cosineSimilarity_user = (myHistory, othersHistory) => {
  const totalHistory = Array.from(new Set(myHistory.concat(othersHistory)));
  let myVector = [];
  let otherVector = [];
  for (let i = 0; i < totalHistory.length; i++) {
    if (myHistory.includes(totalHistory[i])) {
      myVector.push(1);
    } else {
      myVector.push(0);
    }
    if (othersHistory.includes(totalHistory[i])) {
      otherVector.push(1);
    } else {
      otherVector.push(0);
    }
  }
  // console.log("totalHistory : ", totalHistory);
  // console.log("myHistory : ", myHistory);
  // console.log("othersHistory", othersHistory);
  // console.log("Me : ", myVector);
  // console.log("Other : ", otherVector);
  let mySum = 0;
  let otherSum = 0;
  myVector.forEach(value => (mySum += value));
  otherVector.forEach(value => (otherSum += value));
  const denominator = Math.sqrt(mySum * otherSum);
  let numerator = 0;
  for (let j = 0; j < myVector.length; j++) {
    numerator += myVector[j] * otherVector[j];
  }
  const score = numerator / denominator;
  // console.log(score);
  // console.log(
  //   "--------------------------------------------------------------------------------------"
  // );
  return score;
};

const find_recommended_books_by_history = async me => {
  let mostSimilarUser;
  let result;
  const allUser = await userModel.find({
    $where: "this.history.length > 5",
  });
  // .populate("history");
  allUser.forEach(user => {
    if (me.ID === user.ID) {
      return;
    }
    if (mostSimilarUser == null) {
      // console.log("mostSimilarUser 초기화");
      mostSimilarUser = user;
      return;
    }
    if (
      cosineSimilarity_user(me.history, user.history) >
      cosineSimilarity_user(me.history, mostSimilarUser.history)
    ) {
      mostSimilarUser = user;
    }
  });

  if (cosineSimilarity_user(me.history, mostSimilarUser.history) < THRESHOLD) {
    // console.log(mostSimilarUser.ID);
    // console.log(cosineSimilarity_user(me.history, mostSimilarUser.history));
    mostSimilarUser = "";
  }

  if (mostSimilarUser) {
    result = mostSimilarUser.history.filter(his => !me.history.includes(his));
  }
  return result;
};

const search = async (req, res) => {
  console.log(req.session);
  const { _id, ID } = req.session.user;
  const { keyword } = req.query;
  const user = await userModel.findById(_id);
  if (keyword) {
    let books;
    let results;
    let recommends;
    try {
      books = await find_related_books(keyword);
      if (books.length > 0) {
        if (!user.history.includes(books[0]._id)) {
          user.history.push(books[0]._id);
        }
        // else {
        //   console.log("이미 history에 있는 책입니다");
        // }
      }
      await user.save();
    } catch (error) {
      console.log("Error in find_related_books : ", error);
    }
    try {
      results = await find_recommended_books_by_keyword(books);
    } catch (error) {
      console.log("Error in find_recommended_books_by_keyword : ", error);
    }
    try {
      if (user.history.length > 5) {
        recommends = await find_recommended_books_by_history(user);
      } else {
        console.log("아직 history가 적습니다.");
      }
    } catch (error) {
      console.log("Error in find_recommended_books_by_history : ", error);
    }

    let book;
    let recommends_result = [];
    if (recommends !== undefined) {
      for (let i = 0; i < recommends.length; i++) {
        book = await bookModel.findById(recommends[i]);
        recommends_result.push(book);
      }
    }

    // return res.render("search", {
    //   pageTitle: "Search",
    //   books,
    //   keyword,
    //   results,
    //   recommends_result,
    //   ID,
    // });
    return res.status(200).send({ books, results, recommends_result, keyword, ID });
  }
  return res.status(400).render("home", {
    pageTitle: "Home",
    errorMessage: "Please enter the keyword",
  });
};

const getLogin = (req, res) => {
  return res.render("login", { pageTitle: "Login" });
};

const postLogin = async (req, res) => {
  const { ID, password } = req.body;
  const user = await userModel.findOne({ ID });
  if (!user) {
    req.flash("error", "An account with this ID does not exists");
    return res.sendStatus(400);
  }
  const checkPW = await bcrypt.compare(password, user.password);
  if (!checkPW) {
    req.flash("error", "Wrong Password");
    return res.sendStatus(400);
  }
  req.session.loggedIn = true;
  req.session.user = user;
  console.log(req.session);
  return res.status(200).send(req.session.id);
};

const getJoin = (req, res) => res.render("join", { pageTitle: "Join" });
const postJoin = async (req, res) => {
  const { ID, password } = req.body;
  const exists = await userModel.findOne({ ID: ID });
  if (exists) {
    return res.status(400).render("join", {
      pageTitle: "Join",
      errorMessage: "This id is already taken.",
    });
  }
  try {
    await userModel.create({
      ID,
      password,
    });
  } catch (error) {
    console.log("Create User : ", error);
    return res.status(400).render("join", {
      pageTitle: "Join",
      errorMessage: error._message,
    });
  }
  res.sendStatus(200);
};
const logout = (req, res) => {
  console.log(req.session);
  req.session.destroy();
  return res.sendStatus(200);
};

rootRouter.route("/").get(home);
rootRouter.route("/join").get(getJoin).post(postJoin);
rootRouter.route("/login").get(getLogin).post(postLogin);
rootRouter.route("/logout").get(logout);
rootRouter.route("/search").post(search);

export default rootRouter;
