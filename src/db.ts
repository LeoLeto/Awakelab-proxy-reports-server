import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { NormalizedLicenseRow } from "./types.js";
import { CFG } from "./config.js";

export function createPool() {
  return mysql.createPool({
    host: CFG.AURORA_HOST,
    port: CFG.DB_PORT,
    user: CFG.DBUSER,
    password: CFG.DBPASSWORD,
    database: CFG.DBNAME,
    waitForConnections: true,
    connectionLimit: 6,
    timezone: "Z",
    charset: "utf8mb4",
  });
}

const UPsertSQL = `
INSERT INTO API_REPORT_LICENSE_DETAILS
(customer_ref, customer_name, customer_source, user_username, user_fullname, product_ref, product_title, product_duration, product_price,
 license_details, license_start, license_end, tracking_first_access, tracking_last_access, tracking_visits, tracking_elapsed_time,
 natural_key_hash, is_provisional, _fetch_date_from, _fetch_date_to, _source_page)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
ON DUPLICATE KEY UPDATE
  customer_name=VALUES(customer_name),
  customer_source=VALUES(customer_source),
  user_fullname=VALUES(user_fullname),
  product_title=COALESCE(NULLIF(VALUES(product_title), ''), product_title),
  product_duration=COALESCE(VALUES(product_duration), product_duration),
  product_price=COALESCE(VALUES(product_price), product_price),
  license_details=VALUES(license_details),
  license_start=COALESCE(VALUES(license_start), license_start),
  license_end=COALESCE(VALUES(license_end), license_end),
  tracking_first_access=COALESCE(VALUES(tracking_first_access), tracking_first_access),
  tracking_last_access=COALESCE(VALUES(tracking_last_access), tracking_last_access),
  tracking_visits=VALUES(tracking_visits),
  tracking_elapsed_time=VALUES(tracking_elapsed_time),
  is_provisional=VALUES(is_provisional),
  _fetch_date_from=VALUES(_fetch_date_from),
  _fetch_date_to=VALUES(_fetch_date_to),
  _fetched_at=CURRENT_TIMESTAMP,
  _source_page=VALUES(_source_page);
`;

const InsertRawSQL = `
INSERT INTO scorm_proxy_raw
(natural_key_hash, payload, source_file, source_row_index, _fetch_date_from, _fetch_date_to, _source_page)
VALUES (?, ?, ?, ?, ?, ?, ?);
`;

export async function upsertLicense(
  pool: ReturnType<typeof createPool>,
  row: NormalizedLicenseRow
) {
  const conn = await pool.getConnection();
  try {
    const params = [
      row.customer_ref,
      row.customer_name,
      row.customer_source,
      row.user_username,
      row.user_fullname,
      row.product_ref,
      row.product_title,
      row.product_duration,
      row.product_price,
      row.license_details,
      row.license_start,
      row.license_end,
      row.tracking_first_access,
      row.tracking_last_access,
      row.tracking_visits,
      row.tracking_elapsed_time,
      row.natural_key_hash,
      row.is_provisional,
      row._fetch_date_from,
      row._fetch_date_to,
      row._source_page,
    ].map((v) => (v === undefined ? null : v));
    await conn.execute(UPsertSQL, params);
  } finally {
    conn.release();
  }
}

export async function insertRawRow(
  pool: ReturnType<typeof createPool>,
  rawRow: any,
  sourceFile: string | null,
  rowIndex: number | null
) {
  const conn = await pool.getConnection();
  try {
    const payload =
      typeof rawRow === "string" ? rawRow : JSON.stringify(rawRow);
    const params = [
      rawRow.natural_key_hash ?? null,
      payload,
      sourceFile,
      rowIndex,
      rawRow._fetch_date_from ?? null,
      rawRow._fetch_date_to ?? null,
      rawRow._source_page ?? null,
    ];
    await conn.execute(InsertRawSQL, params);
  } finally {
    conn.release();
  }
}

export async function getLastFetchDate(
  pool: ReturnType<typeof createPool>
): Promise<string | null> {
  const [rows] = await pool.query(
    "SELECT last_fetch_to FROM API_REPORT_METADATA WHERE id = 1"
  );
  const r = (rows as any[])[0];
  return r?.last_fetch_to ? r.last_fetch_to.toISOString().slice(0, 10) : null;
}

export async function setLastFetchDate(
  pool: ReturnType<typeof createPool>,
  date: string
) {
  await pool.query(
    "INSERT INTO API_REPORT_METADATA (id, last_fetch_to) VALUES (1, ?) ON DUPLICATE KEY UPDATE last_fetch_to = VALUES(last_fetch_to)",
    [date]
  );
}
