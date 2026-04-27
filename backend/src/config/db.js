import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

function getMongoDatabaseName(uri) {
  const uriWithoutCredentials = getUriWithoutCredentials(uri);
  const pathStart = uriWithoutCredentials.indexOf("/");

  if (pathStart === -1) {
    return "mindfree";
  }

  const databaseName = uriWithoutCredentials.slice(pathStart + 1).split(/[?#]/)[0];

  return databaseName || "mindfree";
}

function getSafeMongoTarget(uri) {
  const protocolEnd = uri.indexOf("://");
  const protocol = protocolEnd === -1 ? "mongodb" : uri.slice(0, protocolEnd);
  const uriWithoutCredentials = getUriWithoutCredentials(uri);
  const hosts = uriWithoutCredentials.split(/[/?#]/)[0];
  const databaseName = getMongoDatabaseName(uri);

  return `${protocol}://${hosts}/${databaseName}`;
}

function getUriWithoutCredentials(uri) {
  const protocolEnd = uri.indexOf("://");
  const rest = protocolEnd === -1 ? uri : uri.slice(protocolEnd + 3);
  const credentialsEnd = rest.lastIndexOf("@");

  return credentialsEnd === -1 ? rest : rest.slice(credentialsEnd + 1);
}

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  const dbName = getMongoDatabaseName(mongoUri);

  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    dbName,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000
  });

  logger.info("MongoDB connected", {
    target: getSafeMongoTarget(mongoUri)
  });
}
