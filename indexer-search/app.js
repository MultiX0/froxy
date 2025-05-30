const dotenv = require("dotenv");
const express = require("express");
const { calculateTfIdfInBatches } = require("./lib/services/indexer");
const { searchAPI } = require("./lib/services/search");

dotenv.config();

const app = express();
const port = process.env.PORT;


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

let indexingStatus = {
  isRunning: false,
  progress: 0,
  message: 'Ready',
  startTime: null,
  error: null
};

app.get("/indexing-tracked", async (req, res) => {
  try {
    if (indexingStatus.isRunning) {
      return res.status(409).json({
        error: "Indexing is already in progress",
        status: indexingStatus
      });
    }

    // Reset status
    indexingStatus = {
      isRunning: true,
      progress: 0,
      message: 'Starting TF-IDF indexing...',
      startTime: new Date(),
      error: null
    };

    // Start indexing process
    calculateTfIdfInBatches()
      .then(() => {
        indexingStatus.isRunning = false;
        indexingStatus.progress = 100;
        indexingStatus.message = 'Indexing completed successfully';
        console.log('TF-IDF indexing completed');
      })
      .catch((error) => {
        indexingStatus.isRunning = false;
        indexingStatus.error = error.message;
        indexingStatus.message = 'Indexing failed';
        console.error('TF-IDF indexing failed:', error);
      });

    res.status(202).json({
      message: "TF-IDF indexing started",
      status: indexingStatus
    });
  } catch (error) {
    indexingStatus.isRunning = false;
    indexingStatus.error = error.message;
    console.error('Error starting indexing:', error);
    res.status(500).json({
      error: "Failed to start indexing process",
      details: error.message
    });
  }
});

app.get("/indexing-status", (req, res) => {
  res.json({
    status: indexingStatus,
    runtime: indexingStatus.startTime ? 
      Math.floor((new Date() - indexingStatus.startTime) / 1000) + ' seconds' : 
      null
  });
});


// app.use(apiKeyChecker);

app.get('/search', async(req,res) => searchAPI(req,res));

app.listen(port, () => {
  console.log("this server running at port: " + port);
});


