import crypto from "crypto";
import { RawLicenseRow, NormalizedLicenseRow } from "./types.js";

function parseLicenseDetails(lic?: string): {
  start: string | null;
  end: string | null;
} {
  if (!lic) return { start: null, end: null };
  const s = lic.trim();
  const m = s.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4}).*?(\d{1,2})\/(\d{1,2})\/(\d{4})/
  );
  if (m) {
    const [, d1, mo1, y1, d2, mo2, y2] = m;
    const start = `${y1}-${mo1.padStart(2, "0")}-${d1.padStart(2, "0")}`;
    const end = `${y2}-${mo2.padStart(2, "0")}-${d2.padStart(2, "0")}`;
    return { start, end };
  }
  const m2 = s.match(/(\d{4})\/(\d{2})\/(\d{2}).*?(\d{4})\/(\d{2})\/(\d{2})/);
  if (m2) {
    const [, y1, mo1, d1, y2, mo2, d2] = m2;
    return { start: `${y1}-${mo1}-${d1}`, end: `${y2}-${mo2}-${d2}` };
  }
  return { start: null, end: null };
}

function clean(v: any) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

function canonicalStringForHash(row: Partial<NormalizedLicenseRow>) {
  const u = (row.user_username || "").toString().trim().toLowerCase();
  const p = (row.product_ref || "").toString().trim();
  const c = (row.customer_ref || "").toString().trim();
  const title = (row.product_title || "").toString().trim().normalize("NFC");
  const ls = row.license_start || "";
  const le = row.license_end || "";
  return `${u}|${p}|${c}|${title}|${ls}|${le}`;
}

export function normalizeLicenseRow(
  raw: RawLicenseRow,
  fetchFrom?: string,
  fetchTo?: string,
  page?: number
): NormalizedLicenseRow {
  const parsed = parseLicenseDetails(raw.license_details ?? raw.licenseDetails);
  const license_start = parsed.start;
  const license_end = parsed.end;

  const normalized: NormalizedLicenseRow = {
    customer_ref: clean(raw.customer_ref ?? raw.customerRef),
    customer_name: clean(raw.customer_name ?? raw.customerName),
    customer_source: clean(
      raw.customer_source
        ? JSON.stringify(raw.customer_source)
        : raw.customer_source
    ),
    customer_url: clean(raw.customer_url),
    customer_url2: clean(raw.customer_url2),
    customer_url3: clean(raw.customer_url3),
    user_username: clean(raw.user_username ?? raw.username ?? raw.userUsername),
    user_fullname: clean(raw.user_fullname ?? raw.fullname ?? raw.userFullname),

    product_ref: clean(raw.product_ref ?? raw.productRef),
    product_title: clean(raw.product_title ?? raw.productTitle),

    product_duration:
      raw.product_duration !== undefined &&
      raw.product_duration !== null &&
      raw.product_duration !== ""
        ? Number(raw.product_duration)
        : null,
    product_price:
      raw.product_price !== undefined &&
      raw.product_price !== null &&
      raw.product_price !== ""
        ? Number(String(raw.product_price).replace(",", "."))
        : null,

    license_details: clean(raw.license_details ?? raw.licenseDetails),
    tracking_first_access: clean(
      raw.tracking_first_access ?? raw.trackingFirstAccess ?? raw.first_access
    ),
    tracking_last_access: clean(
      raw.tracking_last_access ?? raw.trackingLastAccess ?? raw.last_access
    ),
    tracking_visits:
      raw.tracking_visits !== undefined &&
      raw.tracking_visits !== null &&
      raw.tracking_visits !== ""
        ? Number(raw.tracking_visits)
        : null,
    tracking_elapsed_time:
      raw.tracking_elapsed_time !== undefined &&
      raw.tracking_elapsed_time !== null &&
      raw.tracking_elapsed_time !== ""
        ? Number(raw.tracking_elapsed_time)
        : null,

    license_start,
    license_end,
    natural_key_hash: "",
    is_provisional: license_start && license_end ? 0 : 1,
    _fetch_date_from:
      fetchFrom ?? clean(raw._fetch_date_from ?? raw.fetch_date_from),
    _fetch_date_to: fetchTo ?? clean(raw._fetch_date_to ?? raw.fetch_date_to),
    _source_page: page ?? raw._source_page ?? raw.source_page ?? null,
  };

  const canonical = canonicalStringForHash(normalized);
  normalized.natural_key_hash = crypto
    .createHash("sha256")
    .update(canonical, "utf8")
    .digest("hex")
    .toUpperCase();

  return normalized;
}
