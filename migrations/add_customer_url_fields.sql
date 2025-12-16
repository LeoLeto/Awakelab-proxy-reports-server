-- Migration to add customer URL fields to API_REPORT_LICENSE_DETAILS table
-- Run this SQL script against your database before deploying the updated code

ALTER TABLE API_REPORT_LICENSE_DETAILS
ADD COLUMN customer_url VARCHAR(255) DEFAULT NULL AFTER customer_source,
ADD COLUMN customer_url2 VARCHAR(255) DEFAULT NULL AFTER customer_url,
ADD COLUMN customer_url3 VARCHAR(255) DEFAULT NULL AFTER customer_url2;

-- Optional: Add indexes if you plan to query by URL
-- CREATE INDEX idx_customer_url ON API_REPORT_LICENSE_DETAILS(customer_url);
