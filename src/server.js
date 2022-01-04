import express from "express";
import cors from "cors";
import morgan from "morgan";
import session from "express-session";
import flash from "express-flash";
import MongoStore from "connect-mongo";
import rootRouter from "./routers/rootRouter.js";
import "regenerator-runtime";
import "dotenv/config";
import "./db.js";
import { localMiddleware } from "./middlewares.js";

const app = express();
const logger = morgan("dev");
const PORT = 8080;

const corsOptions = {
  origin: true,
  credentials: true
};

app.set("view engine", "pug");
app.set("views", `${process.cwd()}/src/views`);
app.use(logger);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DB_URL }),
  })
);
app.use(flash());
app.use(localMiddleware);
app.use(cors(corsOptions));

app.use("/", rootRouter);

const handleListening = () =>
  console.log(`✅ Server listening on http://localhost:${PORT}`);
app.listen(PORT, handleListening);
