export type RawLicenseRow = Record<string, any>;

export type NormalizedLicenseRow = {
  customer_ref: string | null;
  customer_name: string | null;
  customer_source: string | null;
  customer_url: string | null;
  customer_url2: string | null;
  customer_url3: string | null;
  user_username: string | null;
  user_fullname: string | null;
  product_ref: string | null;
  product_title: string | null;
  product_duration: number | null;
  product_price: number | null;
  license_details: string | null;
  tracking_first_access: string | null;
  tracking_last_access: string | null;
  tracking_visits: number | null;
  tracking_elapsed_time: number | null;
  license_start: string | null;
  license_end: string | null;
  natural_key_hash: string;
  is_provisional: 0 | 1;
  _fetch_date_from: string | null;
  _fetch_date_to: string | null;
  _source_page: number | null;
};
