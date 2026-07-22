const fs = require('fs');
let content = fs.readFileSync('mobile/lib/screens/warehouse_screen.dart', 'utf8');

const startStr = '// Mock a mock sample photo';
const endStr = '  // AI run_workflow query';
const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

const newMethod = "// Mock a mock sample photo for testing in emulators where file picker/camera might fail\n" +
"  Future<void> _mockCaptureSamplePhoto() async {\n" +
"    try {\n" +
"      final bytes = Uint8List.fromList(List.generate(100, (index) => index));\n" +
"      String path = 'mock_grn_image.jpg';\n" +
"      \n" +
"      if (!kIsWeb) {\n" +
"        final Directory tempDir = await getTemporaryDirectory();\n" +
"        final File mockFile = File('${tempDir.path}/mock_grn_image.jpg');\n" +
"        if (!await mockFile.exists()) {\n" +
"          await mockFile.writeAsBytes(bytes);\n" +
"        }\n" +
"        path = mockFile.path;\n" +
"      }\n" +
"      \n" +
"      setState(() {\n" +
"        _selectedImagePath = path;\n" +
"        _selectedImageBytes = bytes;\n" +
"      });\n" +
"      \n" +
"      if (!mounted) return;\n" +
"      ScaffoldMessenger.of(context).showSnackBar(\n" +
"        const SnackBar(\n" +
"          content: Text('Da tai anh gia lap thanh cong!'),\n" +
"          backgroundColor: Colors.purple,\n" +
"          duration: Duration(seconds: 2),\n" +
"        ),\n" +
"      );\n" +
"    } catch (e) {\n" +
"      debugPrint('Mock error: ' + e.toString());\n" +
"    }\n" +
"  }\n\n";

if (startIdx !== -1 && endIdx !== -1) {
    let newContent = content.substring(0, startIdx) + newMethod + content.substring(endIdx);
    fs.writeFileSync('mobile/lib/screens/warehouse_screen.dart', newContent, 'utf8');
    console.log('Fixed method!');
} else {
    console.log('Not found');
}
