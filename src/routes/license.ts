import express from "express";
import { createPool } from "../db.js";

const router = express.Router();

router.post("/license-details", async (req, res) => {
  try {
    const { date_from, date_to, page } = req.body || {};
    const pageNum = page ?? 1;
    const pageSize = 100;

    const pool = createPool();
    const [rows] = await pool.query(
      `SELECT * FROM API_REPORT_LICENSE_DETAILS WHERE license_start >= ? AND license_end <= ? LIMIT ? OFFSET ?`,
      [date_from, date_to, pageSize, (pageNum - 1) * pageSize]
    );
    await pool.end();

    res.json({ ok: true, license: rows });
  } catch (err: any) {
    console.error("license proxy error", err);
    res.status(500).json({ ok: false, error: err.message || "unexpected" });
  }
});

export default router;
