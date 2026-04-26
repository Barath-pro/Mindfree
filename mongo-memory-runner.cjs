const fs = require("fs");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

(async () => {
  const outputPath = process.env.MONGO_URI_FILE || path.resolve(".mongo-uri.txt");
  const dbPath = path.resolve(".mongo-data");
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  const server = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: "mindfree",
      dbPath: dbPath
    }
  });

  fs.writeFileSync(outputPath, `${server.getUri("mindfree")}\n`, "utf8");

  const hold = setInterval(() => {}, 1 << 30);
  process.on("SIGINT", async () => {
    clearInterval(hold);
    await server.stop();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    clearInterval(hold);
    await server.stop();
    process.exit(0);
  });
})();
