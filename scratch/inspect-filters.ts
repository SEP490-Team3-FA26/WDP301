import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  try {
    await connect(MONGODB_URI);
    console.log('Connected!');

    const collection = connection.db.collection('medicines');
    
    // Get unique manufacturer
    const manufacturers = await collection.distinct('manufacturer');
    console.log('\n--- manufacturers ---', manufacturers.slice(0, 15));

    // Get unique Nước sản xuất
    const countries = await collection.distinct('thong_tin_chi_tiet.Nước sản xuất');
    console.log('\n--- Nước sản xuất ---', countries);

    // Get unique Đối tượng sử dụng
    const audiences = await collection.distinct('thong_tin_chi_tiet.Đối tượng sử dụng');
    console.log('\n--- Đối tượng sử dụng ---', audiences);

    // Get unique Xuất xứ thương hiệu
    const brandOrigins = await collection.distinct('thong_tin_chi_tiet.Xuất xứ thương hiệu');
    console.log('\n--- Xuất xứ thương hiệu ---', brandOrigins);

    // Get unique Mùi vị / Mùi hương
    const flavors = await collection.distinct('thong_tin_chi_tiet.Mùi vị/ Mùi hương');
    console.log('\n--- Mùi vị/ Mùi hương ---', flavors);

    // Get price range stats
    const minPrice = await collection.find().sort({price: 1}).limit(1).toArray();
    const maxPrice = await collection.find().sort({price: -1}).limit(1).toArray();
    console.log(`\nPrice range: ${minPrice[0]?.price} to ${maxPrice[0]?.price}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.close();
  }
}

run();
