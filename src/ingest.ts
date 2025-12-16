import pLimit from "p-limit";
import path from "path";
import { CFG } from "./config.js";
import {
  createPool,
  getLastFetchDate,
  insertRawRow,
  setLastFetchDate,
  upsertLicense,
} from "./db.js";
import { fetchAllLicenseDetails, fetchClientList } from "./fetcher.js";
import { normalizeLicenseRow } from "./normalizer.js";
import { enrichLicenseRowsWithUrls } from "./enricher.js";

export async function ingestLicenses() {
  const pool = createPool();
  const last = await getLastFetchDate(pool);
  const today = new Date().toISOString().slice(0, 10);
  const fromDate = last ?? CFG.FULL_START_DATE;
  const toDate = today;

  // Fetch both license details and client list
  const [rawRows, clients] = await Promise.all([
    fetchAllLicenseDetails({
      fromDate,
      toDate,
      token: CFG.SCORM_TOKEN,
      password: CFG.SCORM_PASSWORD,
      id: CFG.SCORM_ID,
    }),
    fetchClientList({
      token: CFG.SCORM_TOKEN,
      password: CFG.SCORM_PASSWORD,
      id: CFG.SCORM_ID,
    }),
  ]);

  // Enrich license rows with URL data from client list
  const enrichedRows = enrichLicenseRowsWithUrls(rawRows, clients);

  if (!enrichedRows.length) {
    await setLastFetchDate(pool, toDate);
    await pool.end();
    return { fetched: 0, upserted: 0, fromDate, toDate };
  }

  const limit = pLimit(CFG.DB_CONCURRENCY);
  let upserted = 0;

  // iterate sequentially or concurrently per-row (concurrency controlled)
  await Promise.all(
    enrichedRows.map((raw, idx) =>
      limit(async () => {
        const normalized = normalizeLicenseRow(
          raw,
          fromDate,
          toDate,
          raw._source_page ?? null
        );
        // insert raw audit if table exists (ignore errors)
        try {
          await insertRawRow(
            pool,
            raw,
            path.basename(`${fromDate}-${toDate}.json`),
            idx
          );
        } catch (e) {}
        try {
          await upsertLicense(pool, normalized);
          upserted++;
        } catch (e) {
          // write debug if failure
          const dbg = path.join(
            process.cwd(),
            `debug-upsert-fail-${Date.now()}.json`
          );
          try {
            require("fs").writeFileSync(
              dbg,
              JSON.stringify({ raw, err: String(e) }, null, 2)
            );
          } catch {}
        }
      })
    )
  );

  await setLastFetchDate(pool, toDate);
  await pool.end();
  return { fetched: enrichedRows.length, upserted, fromDate, toDate };
}
