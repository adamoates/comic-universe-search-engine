require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const routes = require("./routes");

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("tiny"));

app.use("/", routes());

app.listen(port, () => {
  console.log(`Comic Universe Search Engine listening at http://localhost:${port}`);
});
