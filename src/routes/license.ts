import express from "express";
import { createPool } from "../db.js";

const router = express.Router();

router.get("/customers", async (req, res) => {
  try {
    const pool = createPool();
    const [rows] = await pool.query(
      `SELECT DISTINCT customer_name 
       FROM API_REPORT_LICENSE_DETAILS 
       WHERE customer_name IS NOT NULL 
       ORDER BY customer_name`
    );
    await pool.end();
    res.json({ ok: true, customers: rows });
  } catch (err: any) {
    console.error("customers error", err);
    res.status(500).json({ ok: false, error: err.message || "unexpected" });
  }
});

router.post("/license-details", async (req, res) => {
  try {
    const { date_from, date_to, page, customer_name } = req.body || {};
    const pageNum = page ?? 1;
    const pageSize = 100;

    console.log("Received request:", { date_from, date_to, page, customer_name });

    const pool = createPool();
    
    // Build query dynamically based on provided dates and customer
    let query = `SELECT * FROM API_REPORT_LICENSE_DETAILS`;
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (date_from && date_to) {
      conditions.push(`license_start <= ? AND license_end >= ?`);
      params.push(date_to, date_from);
    } else if (date_from) {
      conditions.push(`license_end >= ?`);
      params.push(date_from);
    } else if (date_to) {
      conditions.push(`license_start <= ?`);
      params.push(date_to);
    }
    
    if (customer_name) {
      conditions.push(`customer_name = ?`);
      params.push(customer_name);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }
    
    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, (pageNum - 1) * pageSize);
    
    console.log("Executing query:", query, params);
    
    const [rows] = await pool.query(query, params);
    await pool.end();

    console.log("Query successful, rows:", Array.isArray(rows) ? rows.length : 0);
    
    // Log first record to check URL fields
    if (Array.isArray(rows) && rows.length > 0) {
      const firstRow = rows[0] as any;
      console.log("Sample record:", {
        customer_name: firstRow.customer_name,
        customer_url: firstRow.customer_url,
        customer_url2: firstRow.customer_url2,
        customer_url3: firstRow.customer_url3,
      });
    }
    
    res.json({ ok: true, license: rows });
  } catch (err: any) {
    console.error("license proxy error", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ ok: false, error: err.message || "unexpected" });
  }
});

export default router;
