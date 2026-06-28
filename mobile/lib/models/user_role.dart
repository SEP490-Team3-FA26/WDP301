enum UserRole {
  admin,
  headBranch, // Giám Đốc Chi Nhánh
  warehouse,  // Quản Lý Kho
  branch,     // Quản Lý Cơ Sở
  pharmacist, // Dược Sĩ Bán Hàng
  customer,   // Khách Hàng
}

extension UserRoleExtension on UserRole {
  String get label {
    switch (this) {
      case UserRole.admin:
        return 'Admin Hệ Thống';
      case UserRole.headBranch:
        return 'Giám Đốc Chi Nhánh';
      case UserRole.warehouse:
        return 'Quản Lý Kho';
      case UserRole.branch:
        return 'Quản Lý Cơ Sở';
      case UserRole.pharmacist:
        return 'Dược Sĩ Bán Hàng';
      case UserRole.customer:
        return 'Khách Hàng (Store)';
    }
  }
}
