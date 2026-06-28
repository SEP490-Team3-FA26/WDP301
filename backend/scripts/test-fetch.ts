import * as http from 'http';

http.get('http://localhost:4000/api/medicines?page=1&limit=10', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('API Status Code:', res.statusCode);
      console.log('Total in response:', json.total);
      console.log('Data array length:', json.data ? json.data.length : 'N/A');
      if (json.data) {
        json.data.forEach((item: any, idx: number) => {
          console.log(`[Item ${idx + 1}]`);
          console.log(' - Name:', item.name);
          console.log(' - Expiry:', item.expiry);
          console.log(' - Batches length:', item.batches ? item.batches.length : 'N/A');
        });
      }
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
});
