const dotenv = require("dotenv");
const express = require("express");
const { calculateTfIdfInBatches } = require("./lib/services/indexer");
const { searchAPI } = require("./lib/services/search");

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;


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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { healthCheck } = require('./lib/services/db_service');
    const isHealthy = await healthCheck();
    
    if (isHealthy) {
      res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } else {
      res.status(503).json({ 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        database: 'disconnected'
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: error.message 
    });
  }
});

app.use(apiKeyChecker);

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

app.get("/results-count", async (req, res) => {
  const pg = require('./lib/services/db_service');
  const resultCountQuery = 'SELECT COUNT(*) FROM pages;';
  const data = await pg.query(resultCountQuery);
  const count = data.rows[0].count;
  return res.json({count})
  
});


app.get("/indexing-status", (req, res) => {
  res.json({
    status: indexingStatus,
    runtime: indexingStatus.startTime ? 
      Math.floor((new Date() - indexingStatus.startTime) / 1000) + ' seconds' : 
      null
  });
});



app.get('/search', async(req,res) => searchAPI(req,res));

app.listen(port, () => {
  console.log("this server running at port: " + port);
});


