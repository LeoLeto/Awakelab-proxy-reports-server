import dotenv from "dotenv";
dotenv.config();
export const CFG = {
  SCORM_TOKEN: process.env.SCORM_TOKEN!,
  SCORM_PASSWORD: process.env.SCORM_PASSWORD!,
  SCORM_ID: process.env.SCORM_ID!,
  AURORA_HOST: process.env.AURORA_HOST ?? "127.0.0.1",
  DB_PORT: Number(process.env.DB_PORT ?? 3306),
  DBUSER: process.env.DBUSER!,
  DBPASSWORD: process.env.DBPASSWORD!,
  DBNAME: process.env.DBNAME ?? "scorm_proxy_mirror",
  FULL_START_DATE: process.env.FULL_START_DATE ?? "2020-01-01",
  DB_CONCURRENCY: Number(process.env.DB_CONCURRENCY ?? 6),
  OUT_DIR: process.env.OUT_DIR ?? "./out",
};
