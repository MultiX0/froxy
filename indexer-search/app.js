const dotenv = require("dotenv");
const express = require("express");
const { indexPagesToQdrant } = require("./lib/services/indexer");
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

app.get("/results-count", async (req, res) => {
  const pg = require('./lib/services/db_service');
  const resultCountQuery = 'SELECT COUNT(*) FROM pages;';
  const data = await pg.query(resultCountQuery);
  const count = data.rows[0].count;
  return res.json({count})
  
});

app.get('/search', async(req,res) => searchAPI(req,res));

app.listen(port, () => {
  console.log("this server running at port: " + port);
});


