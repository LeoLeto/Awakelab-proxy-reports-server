import { createPool } from "./db.js";
import { fetchClientList } from "./fetcher.js";
import { CFG } from "./config.js";

/**
 * Backfill script to update existing records with URL data
 * Run this once after deploying the URL fields feature
 */
async function backfillUrls() {
  console.log("Starting URL backfill process...");
  
  const pool = createPool();
  
  try {
    // Fetch client list
    console.log("Fetching client list...");
    const clients = await fetchClientList({
      token: CFG.SCORM_TOKEN,
      password: CFG.SCORM_PASSWORD,
      id: CFG.SCORM_ID,
    });
    
    console.log(`Fetched ${clients.length} clients`);
    
    if (clients.length === 0) {
      console.error("WARNING: No clients were fetched from API!");
      console.log("Please check your API credentials and the API_GET_CLIENT_LIST endpoint");
      await pool.end();
      return;
    }
    
    // Show sample of first 5 clients
    console.log("\nSample of fetched clients:");
    clients.slice(0, 5).forEach(client => {
      console.log(`  - name: "${client.name}"`);
      console.log(`    source: "${client.source}"`);
      console.log(`    alt_source: "${JSON.stringify(client.alt_source)}"`);
      console.log(`    alt_source2: "${JSON.stringify(client.alt_source2)}"`);
      console.log("");
    });
    
    // Create a map for quick lookup: customer_name -> client data
    const clientMap = new Map<string, typeof clients[0]>();
    
    for (const client of clients) {
      if (client.name) {
        const normalizedName = client.name.trim().toLowerCase();
        clientMap.set(normalizedName, client);
        console.log(`Mapped client: "${client.name}" -> source: ${client.source}`);
      }
    }
    
    // Fetch all records from database
    console.log("\nFetching records from database...");
    const [rows] = await pool.query<any[]>(
      "SELECT customer_name, customer_ref FROM API_REPORT_LICENSE_DETAILS"
    );
    
    console.log(`Found ${rows.length} records to process`);
    
    // Track statistics
    let updated = 0;
    let notFound = 0;
    const notFoundNames = new Set<string>();
    
    // Update records in batches
    for (const row of rows) {
      if (!row.customer_name) {
        notFound++;
        continue;
      }
      
      const normalizedCustomerName = row.customer_name.trim().toLowerCase();
      const client = clientMap.get(normalizedCustomerName);
      
      if (client) {
        const customer_url = typeof client.source === 'string' ? client.source : null;
        const customer_url2 = typeof client.alt_source === 'string' ? client.alt_source : null;
        const customer_url3 = typeof client.alt_source2 === 'string' ? client.alt_source2 : null;
        
        // Log first few updates to verify data
        if (updated < 3) {
          console.log(`Updating "${row.customer_name}":`);
          console.log(`  customer_url: ${customer_url}`);
          console.log(`  customer_url2: ${customer_url2}`);
          console.log(`  customer_url3: ${customer_url3}`);
        }
        
        const [result] = await pool.query(
          `UPDATE API_REPORT_LICENSE_DETAILS 
           SET customer_url = ?, customer_url2 = ?, customer_url3 = ?
           WHERE customer_name = ?`,
          [customer_url, customer_url2, customer_url3, row.customer_name]
        );
        
        // Log affected rows
        if (updated < 3) {
          console.log(`  Rows affected: ${(result as any).affectedRows}`);
        }
        
        updated++;
        if (updated % 100 === 0) {
          console.log(`Updated ${updated} records...`);
        }
      } else {
        notFound++;
        notFoundNames.add(row.customer_name);
      }
    }
    
    console.log("\n=== Backfill Complete ===");
    console.log(`Total records processed: ${rows.length}`);
    console.log(`Records updated: ${updated}`);
    console.log(`Records without matching client: ${notFound}`);
    
    if (notFoundNames.size > 0) {
      console.log("\nCustomer names without matching client:");
      Array.from(notFoundNames).slice(0, 20).forEach(name => {
        console.log(`  - "${name}"`);
      });
      if (notFoundNames.size > 20) {
        console.log(`  ... and ${notFoundNames.size - 20} more`);
      }
    }
    
  } catch (error) {
    console.error("Error during backfill:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the backfill
backfillUrls().catch(console.error);
