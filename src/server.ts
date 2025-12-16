import express from "express";
import { ingestLicenses } from "./ingest.js";
import licenseRouter from "./routes/license.js";

import cors from "cors";

const app = express();
app.use(
  cors({
    origin: ["https://proxy-reports.awakelab.world", "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/ingest/licenses", async (req, res) => {
  try {
    const report = await ingestLicenses();
    res.json({ ok: true, report });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.use("/api", licenseRouter);

const PORT = process.env.HTTP_PORT ? Number(process.env.HTTP_PORT) : 3000;
app.listen(PORT, () => console.log(`ingest server listening ${PORT}`));
