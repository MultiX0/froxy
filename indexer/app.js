const dotenv = require("dotenv");
const express = require("express");
const { initDB } = require("./lib/services/supabase_service");

dotenv.config();

const app = express();
const port = process.env.PORT;

initDB();

const apiKeyChecker = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(403).send({ message: "forbidden" });
  }

  const validApiKey = process.env.API_KEY;

  if (apiKey !== validApiKey) {
    return res.status(403).send({ message: "forbidden" });
  }

  next();
};

app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status >= 400 ? "\x1b[31m" : "\x1b[32m";
    console.log(
      `${statusColor}[${status}]\x1b[0m ${req.method} ${req.url} - ${duration}ms`
    );
  });
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use(apiKeyChecker);

app.listen(port, () => {
  console.log("this server running at port: " + port);
});
