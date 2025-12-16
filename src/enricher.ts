import { RawLicenseRow } from "./types.js";
import { ClientData } from "./fetcher.js";

/**
 * Enriches license rows with URL data from client list
 * Matches by customer_name = client.name
 */
export function enrichLicenseRowsWithUrls(
  licenseRows: RawLicenseRow[],
  clients: ClientData[]
): RawLicenseRow[] {
  console.log(`[Enricher] Starting enrichment with ${licenseRows.length} license rows and ${clients.length} clients`);
  
  // Create a map for quick lookup: customer_name -> client data
  const clientMap = new Map<string, ClientData>();
  
  for (const client of clients) {
    if (client.name) {
      // Normalize the name for matching (trim and lowercase)
      const normalizedName = client.name.trim().toLowerCase();
      clientMap.set(normalizedName, client);
    }
  }
  
  console.log(`[Enricher] Built client map with ${clientMap.size} entries`);

  let matched = 0;
  let notMatched = 0;
  const sampleNotMatched: string[] = [];

  // Enrich each license row
  const enriched = licenseRows.map((row) => {
    const customerName = row.customer_name || row.customerName;
    if (!customerName) {
      notMatched++;
      return row;
    }

    const normalizedCustomerName = customerName.trim().toLowerCase();
    const client = clientMap.get(normalizedCustomerName);

    if (client) {
      matched++;
      // Add URL fields from client data
      const enrichedRow = {
        ...row,
        customer_url: typeof client.source === 'string' ? client.source : null,
        customer_url2: typeof client.alt_source === 'string' ? client.alt_source : null,
        customer_url3: typeof client.alt_source2 === 'string' ? client.alt_source2 : null,
      };
      
      // Log first match as sample
      if (matched === 1) {
        console.log(`[Enricher] Sample match: "${customerName}" -> URLs: [${enrichedRow.customer_url}, ${enrichedRow.customer_url2}, ${enrichedRow.customer_url3}]`);
      }
      
      return enrichedRow;
    }

    // If no match found, return original row
    notMatched++;
    if (sampleNotMatched.length < 5) {
      sampleNotMatched.push(customerName);
    }
    return row;
  });
  
  console.log(`[Enricher] Enrichment complete: ${matched} matched, ${notMatched} not matched`);
  if (sampleNotMatched.length > 0) {
    console.log(`[Enricher] Sample unmatched customer names:`, sampleNotMatched);
  }

  return enriched;
}
