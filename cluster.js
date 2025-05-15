const cluster = require("cluster");
const app = require("./app");
require("dotenv").config();
const os = require("os");
const logger = require("./config/logger");

const numCPUs = os.cpus().length;
const envForks = parseInt(process.env.NUM_FORKS);
const port = process.env.PORT || 3000;

const forks =
  !isNaN(envForks) && envForks >= 1 && envForks <= numCPUs ? envForks : numCPUs;

const useForks = process.env.USE_FORKS === "true";

if (useForks && cluster.isPrimary) {
  logger.startServer();

  if (isNaN(envForks) || envForks < 1 || envForks > numCPUs) {
    logger.warn(
      `Invalid NUM_FORKS: ${process.env.NUM_FORKS}. Using ${numCPUs} instead.`,
    );
  }

  for (let i = 0; i < forks; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    logger.warn(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  if (cluster.isPrimary) {
    logger.startServer();
    app.listen(port, () => {
      logger.info(`Server listening on http://localhost:${port}`);
    });
  } else {
    app.listen(port, () => {
      logger.info(
        `Worker ${process.pid} is listening on http://localhost:${port}`,
      );
    });
  }
}
