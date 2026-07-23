const fs = require('fs');
let code = fs.readFileSync('mobile/lib/screens/warehouse_screen.dart', 'utf8');

const startStr = '// Carousel Navigation Bar';
const endStr = 'const Divider(height: 1),';
const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr, startIdx + startStr.length);

if (startIdx !== -1 && endIdx !== -1) {
  const replacementStr = `// Carousel Navigation Bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  color: Colors.grey.shade50,
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        TextButton.icon(
                          onPressed: _currentInspectionIndex > 0 ? _goToPrev : null,
                          icon: const Icon(Icons.chevron_left, size: 16),
                          label: const Text('Trước đó', style: TextStyle(fontSize: 11)),
                          style: TextButton.styleFrom(
                            foregroundColor: const Color(0xFF00838F),
                          ),
                        ),
                        const SizedBox(width: 4),
                        TextButton.icon(
                          onPressed: _skipCurrentItem,
                          icon: const Icon(Icons.redo_rounded, size: 14),
                          label: const Text('Bỏ qua', style: TextStyle(fontSize: 11)),
                          style: TextButton.styleFrom(foregroundColor: Colors.orange.shade700),
                        ),
                        const SizedBox(width: 4),
                        TextButton.icon(
                          onPressed: _goToWorksheet,
                          icon: const Icon(Icons.list_alt_rounded, size: 14),
                          label: const Text('Danh sách', style: TextStyle(fontSize: 11)),
                          style: TextButton.styleFrom(foregroundColor: Colors.blueGrey),
                        ),
                        const SizedBox(width: 4),
                        TextButton.icon(
                          onPressed: _currentInspectionIndex < items.length - 1 ? _goToNext : null,
                          icon: const Icon(Icons.chevron_right, size: 16),
                          label: const Text('Tiếp theo', style: TextStyle(fontSize: 11)),
                          style: TextButton.styleFrom(
                            foregroundColor: const Color(0xFF00838F),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                `;
  
  code = code.substring(0, startIdx) + replacementStr + code.substring(endIdx);
  fs.writeFileSync('mobile/lib/screens/warehouse_screen.dart', code);
  console.log('Fixed buttons robustly!');
} else {
  console.log('Target string not found');
}
