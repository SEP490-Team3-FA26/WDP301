const fs = require('fs');
let code = fs.readFileSync('mobile/lib/services/api_service.dart', 'utf8');
// Normalize line endings
code = code.replace(/\r\n/g, '\n');

const targetStr = `      try {\n        var request = http.MultipartRequest(\n          'POST',\n          Uri.parse('${"$"}{baseUrl}/api/ai/receipts/${"$"}{receiptId}/items/${"$"}{receiptItemId}/inspection'),\n        );`;

const replacement = `      try {\n        var request = http.MultipartRequest(\n          'POST',\n          Uri.parse('${"$"}{baseUrl}/api/ai/receipts/${"$"}{receiptId}/items/${"$"}{receiptItemId}/inspection'),\n        );\n        request.headers.addAll(_authHeaders);\n        request.headers['x-internal-token'] = 'wdp301-super-secret-key-change-in-production';`;

const targetStr2 = `        var request = http.MultipartRequest(\n          'POST',\n          Uri.parse('${"$"}{localAiUrl}/api/ai/receipts/${"$"}{receiptId}/items/${"$"}{receiptItemId}/inspection'),\n        );`;

const replacement2 = `        var request = http.MultipartRequest(\n          'POST',\n          Uri.parse('${"$"}{localAiUrl}/api/ai/receipts/${"$"}{receiptId}/items/${"$"}{receiptItemId}/inspection'),\n        );\n        request.headers.addAll(_authHeaders);\n        request.headers['x-internal-token'] = 'wdp301-super-secret-key-change-in-production';`;

if (code.includes(targetStr) && code.includes(targetStr2)) {
  code = code.replace(targetStr, replacement);
  code = code.replace(targetStr2, replacement2);
  fs.writeFileSync('mobile/lib/services/api_service.dart', code);
  console.log('Fixed API headers!');
} else {
  console.log('Target string not found');
  console.log(code.includes(targetStr));
  console.log(code.includes(targetStr2));
}
