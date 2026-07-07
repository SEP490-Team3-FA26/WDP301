# IDE Diagnostics & Problems Log

> [!IMPORTANT]
> **Lưu ý quan trọng / Important Note:**
> Các lỗi dưới đây được phát hiện bởi IDE trong thư mục `backend/node_modules/wdp301-workspace/mobile/...`.
> Nguyên nhân do thư mục `wdp301-workspace` là một liên kết (symlink) trỏ đến gốc dự án (`..`), chứa thư mục `mobile`.
> Khi IDE quét thư mục này, plugin phân tích Dart/Flutter không thể định vị được các gói phụ thuộc (như `package:flutter/material.dart`) trong ngữ cảnh của `node_modules` nên báo lỗi giả (false positives).
> 
> Khi chạy kiểm tra trực tiếp bằng lệnh `flutter analyze` trong thư mục dự án `mobile/` chính thức, hệ thống trả về: **No issues found!** (Không phát hiện lỗi nào).

---

## Danh sách lỗi trích xuất từ IDE (IDE Diagnostics Log)

### Thư mục/Tệp: `d:\CODE\CN8\Pharma\wdp301-rbl-project-wdp_se18d08_group-7\backend\node_modules\wdp301-workspace\mobile\lib\main.dart`

| Dòng | Mức độ | Thông báo lỗi |
| :---: | :---: | :--- |
| 1 | 🔴 Error | Target of URI doesn't exist: 'package:flutter/material.dart'.<br>Try creating the file referenced by the URI, or try using a URI for a file that does exist. |
| 5 | 🔴 Error | The function 'runApp' isn't defined.<br>Try importing the library that defines 'runApp', correcting the name to the name of an existing function, or defining a function named 'runApp'. |
| 8 | 🔴 Error | Classes can only extend other classes.<br>Try specifying a different superclass, or removing the extends clause. |
| 9 | 🔴 Error | No associated named super constructor parameter.<br>Try changing the name to the name of an existing named super constructor parameter, or creating such named parameter. |
| 12 | 🔴 Error | Undefined class 'Widget'.<br>Try changing the name to the name of an existing class, or creating a class with the name 'Widget'. |
| 12 | 🔴 Error | Undefined class 'BuildContext'.<br>Try changing the name to the name of an existing class, or creating a class with the name 'BuildContext'. |
| 13 | 🔴 Error | The method 'MaterialApp' isn't defined for the type 'MyApp'.<br>Try correcting the name to the name of an existing method, or defining a method named 'MaterialApp'. |
| 16 | 🔴 Error | The method 'ThemeData' isn't defined for the type 'MyApp'.<br>Try correcting the name to the name of an existing method, or defining a method named 'ThemeData'. |
| 18 | 🔴 Error | Undefined name 'ColorScheme'.<br>Try correcting the name to one that is defined, or defining the name. |
| 19 | 🔴 Error | The name 'Color' isn't a class.<br>Try correcting the name to match an existing class. |
| 20 | 🔴 Error | Undefined name 'Brightness'.<br>Try correcting the name to one that is defined, or defining the name. |
| 12 | ⚠️ Warning | The method doesn't override an inherited method.<br>Try updating this class to match the superclass, or removing the override annotation. |

### Thư mục/Tệp: `d:\CODE\CN8\Pharma\wdp301-rbl-project-wdp_se18d08_group-7\backend\node_modules\wdp301-workspace\mobile\lib\screens\admin_screen.dart`

| Dòng | Mức độ | Thông báo lỗi |
| :---: | :---: | :--- |
| 1 | 🔴 Error | Target of URI doesn't exist: 'package:flutter/material.dart'.<br>Try creating the file referenced by the URI, or try using a URI for a file that does exist. |
| 3 | 🔴 Error | Classes can only extend other classes.<br>Try specifying a different superclass, or removing the extends clause. |
| 4 | 🔴 Error | No associated named super constructor parameter.<br>Try changing the name to the name of an existing named super constructor parameter, or creating such named parameter. |
| 7 | 🔴 Error | Undefined class 'State'.<br>Try changing the name to the name of an existing class, or creating a class with the name 'State'. |
| 10 | 🔴 Error | Classes can only extend other classes.<br>Try specifying a different superclass, or removing the extends clause. |
| 61 | 🔴 Error | The method 'setState' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'setState'. |
| 68 | 🔴 Error | Undefined class 'Widget'.<br>Try changing the name to the name of an existing class, or creating a class with the name 'Widget'. |
| 68 | 🔴 Error | Undefined class 'BuildContext'.<br>Try changing the name to the name of an existing class, or creating a class with the name 'BuildContext'. |
| 69 | 🔴 Error | The method 'Scaffold' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Scaffold'. |
| 70 | 🔴 Error | The name 'Color' isn't a class.<br>Try correcting the name to match an existing class. |
| 71 | 🔴 Error | The method 'AppBar' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'AppBar'. |
| 72 | 🔴 Error | The name 'Column' isn't a class.<br>Try correcting the name to match an existing class. |
| 73 | 🔴 Error | Undefined name 'CrossAxisAlignment'.<br>Try correcting the name to one that is defined, or defining the name. |
| 75 | 🔴 Error | The method 'Text' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Text'. |
| 77 | 🔴 Error | The method 'TextStyle' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'TextStyle'. |
| 78 | 🔴 Error | Undefined name 'FontWeight'.<br>Try correcting the name to one that is defined, or defining the name. |
| 79 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 83 | 🔴 Error | The method 'Text' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Text'. |
| 85 | 🔴 Error | The method 'TextStyle' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'TextStyle'. |
| 87 | 🔴 Error | Undefined name 'FontWeight'.<br>Try correcting the name to one that is defined, or defining the name. |
| 88 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 94 | 🔴 Error | The method 'Container' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Container'. |
| 95 | 🔴 Error | The name 'BoxDecoration' isn't a class.<br>Try correcting the name to match an existing class. |
| 96 | 🔴 Error | The method 'LinearGradient' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'LinearGradient'. |
| 97 | 🔴 Error | The method 'Color' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Color'. |
| 97 | 🔴 Error | The method 'Color' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Color'. |
| 98 | 🔴 Error | Undefined name 'Alignment'.<br>Try correcting the name to one that is defined, or defining the name. |
| 99 | 🔴 Error | Undefined name 'Alignment'.<br>Try correcting the name to one that is defined, or defining the name. |
| 104 | 🔴 Error | The name 'IconThemeData' isn't a class.<br>Try correcting the name to match an existing class. |
| 104 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 106 | 🔴 Error | The method 'IconButton' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'IconButton'. |
| 107 | 🔴 Error | The name 'Icon' isn't a class.<br>Try correcting the name to match an existing class. |
| 107 | 🔴 Error | Undefined name 'Icons'.<br>Try correcting the name to one that is defined, or defining the name. |
| 107 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 109 | 🔴 Error | Undefined name 'ScaffoldMessenger'.<br>Try correcting the name to one that is defined, or defining the name. |
| 110 | 🔴 Error | The name 'SnackBar' isn't a class.<br>Try correcting the name to match an existing class. |
| 111 | 🔴 Error | The method 'Text' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Text'. |
| 113 | 🔴 Error | The method 'TextStyle' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'TextStyle'. |
| 113 | 🔴 Error | Undefined name 'FontWeight'.<br>Try correcting the name to one that is defined, or defining the name. |
| 115 | 🔴 Error | The method 'Color' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Color'. |
| 116 | 🔴 Error | Undefined name 'SnackBarBehavior'.<br>Try correcting the name to one that is defined, or defining the name. |
| 123 | 🔴 Error | The method 'SingleChildScrollView' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'SingleChildScrollView'. |
| 124 | 🔴 Error | The method 'Padding' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Padding'. |
| 125 | 🔴 Error | Undefined name 'EdgeInsets'.<br>Try correcting the name to one that is defined, or defining the name. |
| 126 | 🔴 Error | The method 'Column' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Column'. |
| 127 | 🔴 Error | Undefined name 'CrossAxisAlignment'.<br>Try correcting the name to one that is defined, or defining the name. |
| 130 | 🔴 Error | The name 'Text' isn't a class.<br>Try correcting the name to match an existing class. |
| 132 | 🔴 Error | The method 'TextStyle' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'TextStyle'. |
| 134 | 🔴 Error | Undefined name 'FontWeight'.<br>Try correcting the name to one that is defined, or defining the name. |
| 135 | 🔴 Error | The method 'Color' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Color'. |
| 138 | 🔴 Error | The name 'SizedBox' isn't a class.<br>Try correcting the name to match an existing class. |
| 141 | 🔴 Error | The method 'Row' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Row'. |
| 143 | 🔴 Error | The method 'Expanded' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Expanded'. |
| 145 | 🔴 Error | Undefined name 'Icons'.<br>Try correcting the name to one that is defined, or defining the name. |
| 148 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 152 | 🔴 Error | The name 'SizedBox' isn't a class.<br>Try correcting the name to match an existing class. |
| 153 | 🔴 Error | The method 'Expanded' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Expanded'. |
| 155 | 🔴 Error | Undefined name 'Icons'.<br>Try correcting the name to one that is defined, or defining the name. |
| 158 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 164 | 🔴 Error | The name 'SizedBox' isn't a class.<br>Try correcting the name to match an existing class. |
| 165 | 🔴 Error | The method 'Row' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Row'. |
| 167 | 🔴 Error | The method 'Expanded' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Expanded'. |
| 169 | 🔴 Error | Undefined name 'Icons'.<br>Try correcting the name to one that is defined, or defining the name. |
| 172 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 176 | 🔴 Error | The name 'SizedBox' isn't a class.<br>Try correcting the name to match an existing class. |
| 177 | 🔴 Error | The method 'Expanded' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Expanded'. |
| 179 | 🔴 Error | Undefined name 'Icons'.<br>Try correcting the name to one that is defined, or defining the name. |
| 182 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 188 | 🔴 Error | The name 'SizedBox' isn't a class.<br>Try correcting the name to match an existing class. |
| 191 | 🔴 Error | The name 'Text' isn't a class.<br>Try correcting the name to match an existing class. |
| 193 | 🔴 Error | The method 'TextStyle' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'TextStyle'. |
| 195 | 🔴 Error | Undefined name 'FontWeight'.<br>Try correcting the name to one that is defined, or defining the name. |
| 196 | 🔴 Error | The method 'Color' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Color'. |
| 199 | 🔴 Error | The name 'SizedBox' isn't a class.<br>Try correcting the name to match an existing class. |
| 200 | 🔴 Error | The method 'Container' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Container'. |
| 201 | 🔴 Error | The method 'BoxDecoration' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'BoxDecoration'. |
| 202 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 203 | 🔴 Error | Undefined name 'BorderRadius'.<br>Try correcting the name to one that is defined, or defining the name. |
| 205 | 🔴 Error | The method 'BoxShadow' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'BoxShadow'. |
| 206 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 208 | 🔴 Error | The name 'Offset' isn't a class.<br>Try correcting the name to match an existing class. |
| 211 | 🔴 Error | Undefined name 'Border'.<br>Try correcting the name to one that is defined, or defining the name. |
| 211 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 213 | 🔴 Error | Undefined name 'ListView'.<br>Try correcting the name to one that is defined, or defining the name. |
| 215 | 🔴 Error | The name 'NeverScrollableScrollPhysics' isn't a class.<br>Try correcting the name to match an existing class. |
| 218 | 🔴 Error | The name 'Divider' isn't a class.<br>Try correcting the name to match an existing class. |
| 218 | 🔴 Error | The method 'Color' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Color'. |
| 223 | 🔴 Error | The method 'ListTile' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'ListTile'. |
| 224 | 🔴 Error | Undefined name 'EdgeInsets'.<br>Try correcting the name to one that is defined, or defining the name. |
| 228 | 🔴 Error | The method 'Text' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Text'. |
| 230 | 🔴 Error | The name 'TextStyle' isn't a class.<br>Try correcting the name to match an existing class. |
| 231 | 🔴 Error | Undefined name 'FontWeight'.<br>Try correcting the name to one that is defined, or defining the name. |
| 233 | 🔴 Error | The method 'Color' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Color'. |
| 236 | 🔴 Error | The method 'Text' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Text'. |
| 238 | 🔴 Error | The name 'TextStyle' isn't a class.<br>Try correcting the name to match an existing class. |
| 240 | 🔴 Error | The method 'Row' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Row'. |
| 241 | 🔴 Error | Undefined name 'MainAxisSize'.<br>Try correcting the name to one that is defined, or defining the name. |
| 243 | 🔴 Error | The method 'Container' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Container'. |
| 244 | 🔴 Error | Undefined name 'EdgeInsets'.<br>Try correcting the name to one that is defined, or defining the name. |
| 248 | 🔴 Error | The method 'BoxDecoration' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'BoxDecoration'. |
| 250 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 251 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 252 | 🔴 Error | Undefined name 'BorderRadius'.<br>Try correcting the name to one that is defined, or defining the name. |
| 254 | 🔴 Error | The method 'Text' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Text'. |
| 256 | 🔴 Error | The method 'TextStyle' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'TextStyle'. |
| 257 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 257 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 258 | 🔴 Error | Undefined name 'FontWeight'.<br>Try correcting the name to one that is defined, or defining the name. |
| 263 | 🔴 Error | The name 'SizedBox' isn't a class.<br>Try correcting the name to match an existing class. |
| 264 | 🔴 Error | The method 'Switch' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Switch'. |
| 267 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 268 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 269 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 270 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 278 | 🔴 Error | The name 'SizedBox' isn't a class.<br>Try correcting the name to match an existing class. |
| 281 | 🔴 Error | The name 'Text' isn't a class.<br>Try correcting the name to match an existing class. |
| 283 | 🔴 Error | The method 'TextStyle' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'TextStyle'. |
| 285 | 🔴 Error | Undefined name 'FontWeight'.<br>Try correcting the name to one that is defined, or defining the name. |
| 286 | 🔴 Error | The method 'Color' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Color'. |
| 289 | 🔴 Error | The name 'SizedBox' isn't a class.<br>Try correcting the name to match an existing class. |
| 290 | 🔴 Error | Undefined name 'ListView'.<br>Try correcting the name to one that is defined, or defining the name. |
| 292 | 🔴 Error | The name 'NeverScrollableScrollPhysics' isn't a class.<br>Try correcting the name to match an existing class. |
| 296 | 🔴 Error | The method 'Card' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Card'. |
| 297 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 298 | 🔴 Error | Undefined name 'EdgeInsets'.<br>Try correcting the name to one that is defined, or defining the name. |
| 299 | 🔴 Error | The method 'RoundedRectangleBorder' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'RoundedRectangleBorder'. |
| 300 | 🔴 Error | Undefined name 'BorderRadius'.<br>Try correcting the name to one that is defined, or defining the name. |
| 301 | 🔴 Error | The method 'BorderSide' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'BorderSide'. |
| 301 | 🔴 Error | Undefined name 'Colors'.<br>Try correcting the name to one that is defined, or defining the name. |
| 304 | 🔴 Error | The method 'Padding' isn't defined for the type '_AdminScreenState'.<br>Try correcting the name to the name of an existing method, or defining a method named 'Padding'. |


---
*Ghi chú: Log này được trích xuất từ dữ liệu chẩn đoán của IDE. Do dung lượng log gốc lớn (> 2.3 MB) vượt quá giới hạn truyền tải của cửa sổ chat, danh sách trên chứa các lỗi đã được trích xuất thành công.*
