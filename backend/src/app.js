const express = require("express");
const cors = require("cors");
const indexRouter = require("./routes/index");
const authRouter = require("./routes/auth");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", indexRouter);
app.use("/api/auth", authRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
