import * as fs from 'fs';
import { parse } from 'csv-parse';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const client = new Client({
  connectionString: connectionString.replace('?pgbouncer=true', ''),
});

async function run() {
  await client.connect();
  console.log("Connected to PostgreSQL database");

  // Xóa bảng cũ
  console.log("Deleting old data in public.medicines...");
  await client.query("DELETE FROM public.medicines");

  const csvPath = path.resolve(__dirname, '../../docs/sql/Medicine_Details.csv');
  
  const records: any[] = [];
  const parser = fs.createReadStream(csvPath).pipe(
    parse({ columns: true, skip_empty_lines: true })
  );

  for await (const record of parser) {
    records.push(record);
  }

  console.log(`Found ${records.length} medicines in CSV. Inserting to DB...`);

  const batchSize = 500;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    // Construct bulk insert query
    let valuesClause = [];
    let queryValues = [];
    let paramIndex = 1;
    
    for (const item of batch) {
      const name = item['Medicine Name'] || "";
      const active_ingredient = item['Composition'] || "";
      const indications = item['Uses'] || "";
      const side_effects = item['Side_effects'] || "";
      const image_url = item['Image URL'] || "";
      const category = item['Manufacturer'] || "";
      const price = Math.floor(Math.random() * (500000 - 10000 + 1) / 1000) * 1000 + 10000;
      const stock_quantity = Math.floor(Math.random() * (100 - 10 + 1)) + 10;
      
      valuesClause.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      queryValues.push(name, active_ingredient, category, indications, side_effects, image_url, price, stock_quantity);
    }
    
    const query = `
      INSERT INTO public.medicines 
      (name, active_ingredient, category, indications, side_effects, image_url, price, stock_quantity)
      VALUES ${valuesClause.join(', ')}
    `;
    
    await client.query(query, queryValues);
    console.log(`Inserted batch ${i} to ${i + batch.length}`);
  }

  console.log("✅ Successfully inserted all medicines into Supabase!");
  await client.end();
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
