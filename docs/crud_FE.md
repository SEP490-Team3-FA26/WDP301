
# React CRUD Feature Skill với Zustand

## Mục tiêu

Triển khai tính năng CRUD trong React sử dụng:

- TypeScript
- Zustand
- Axios
- React Hook Form
- Zod
- React Router

---

## 1. Cấu trúc thư mục

```text
features/product/
├── api/
│   └── product.api.ts
├── components/
│   ├── ProductForm.tsx
│   ├── ProductTable.tsx
│   └── DeleteProductDialog.tsx
├── pages/
│   ├── ProductListPage.tsx
│   ├── ProductCreatePage.tsx
│   └── ProductEditPage.tsx
├── stores/
│   └── product.store.ts
├── product.schema.ts
└── product.types.ts
```

---

## 2. TypeScript Types

```ts
export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  price: number;
  description?: string;
  status: 'active' | 'inactive';
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}
```

---

## 3. API Layer

```ts
import axios from 'axios';
import type {
  CreateProductInput,
  Product,
  ProductListResponse,
  ProductQueryParams,
  UpdateProductInput,
} from '../product.types';

const productApi = axios.create({
  baseURL: '/api/products',
});

export async function getProducts(
  params: ProductQueryParams,
): Promise<ProductListResponse> {
  const response = await productApi.get('/', { params });
  return response.data;
}

export async function getProductById(
  id: string,
): Promise<Product> {
  const response = await productApi.get(`/${id}`);
  return response.data;
}

export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  const response = await productApi.post('/', input);
  return response.data;
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<Product> {
  const response = await productApi.patch(`/${id}`, input);
  return response.data;
}

export async function deleteProduct(
  id: string,
): Promise<void> {
  await productApi.delete(`/${id}`);
}
```

---

## 4. Zustand Store

Store chịu trách nhiệm:

- Lưu danh sách sản phẩm
- Lưu sản phẩm đang được chọn
- Quản lý loading và error
- Quản lý pagination và filter
- Thực hiện Create, Read, Update và Delete

```ts
import { create } from 'zustand';
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from '../api/product.api';
import type {
  CreateProductInput,
  Product,
  ProductQueryParams,
  UpdateProductInput,
} from '../product.types';

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;

  total: number;
  page: number;
  limit: number;
  search: string;
  status?: 'active' | 'inactive';

  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setStatus: (
    status?: 'active' | 'inactive',
  ) => void;

  clearError: () => void;
  clearSelectedProduct: () => void;

  fetchProducts: (
    params?: ProductQueryParams,
  ) => Promise<void>;

  fetchProductById: (
    id: string,
  ) => Promise<void>;

  addProduct: (
    input: CreateProductInput,
  ) => Promise<Product>;

  editProduct: (
    id: string,
    input: UpdateProductInput,
  ) => Promise<Product>;

  removeProduct: (
    id: string,
  ) => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const axiosError = error as {
      response?: {
        data?: {
          message?: string;
        };
      };
    };

    return (
      axiosError.response?.data?.message ??
      'Đã xảy ra lỗi từ máy chủ'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Đã xảy ra lỗi không xác định';
}

export const useProductStore =
  create<ProductState>((set, get) => ({
    products: [],
    selectedProduct: null,

    total: 0,
    page: 1,
    limit: 10,
    search: '',
    status: undefined,

    isLoading: false,
    isSubmitting: false,
    error: null,

    setPage: (page) => {
      set({ page });
    },

    setSearch: (search) => {
      set({
        search,
        page: 1,
      });
    },

    setStatus: (status) => {
      set({
        status,
        page: 1,
      });
    },

    clearError: () => {
      set({ error: null });
    },

    clearSelectedProduct: () => {
      set({ selectedProduct: null });
    },

    fetchProducts: async (params) => {
      set({
        isLoading: true,
        error: null,
      });

      try {
        const state = get();

        const query: ProductQueryParams = {
          page: params?.page ?? state.page,
          limit: params?.limit ?? state.limit,
          search: params?.search ?? state.search,
          status: params?.status ?? state.status,
        };

        const result = await getProducts(query);

        set({
          products: result.data,
          total: result.total,
          page: result.page,
          limit: result.limit,
          isLoading: false,
        });
      } catch (error) {
        set({
          isLoading: false,
          error: getErrorMessage(error),
        });

        throw error;
      }
    },

    fetchProductById: async (id) => {
      set({
        isLoading: true,
        selectedProduct: null,
        error: null,
      });

      try {
        const product = await getProductById(id);

        set({
          selectedProduct: product,
          isLoading: false,
        });
      } catch (error) {
        set({
          isLoading: false,
          error: getErrorMessage(error),
        });

        throw error;
      }
    },

    addProduct: async (input) => {
      set({
        isSubmitting: true,
        error: null,
      });

      try {
        const product = await createProduct(input);

        set((state) => ({
          products: [product, ...state.products],
          total: state.total + 1,
          isSubmitting: false,
        }));

        return product;
      } catch (error) {
        set({
          isSubmitting: false,
          error: getErrorMessage(error),
        });

        throw error;
      }
    },

    editProduct: async (id, input) => {
      set({
        isSubmitting: true,
        error: null,
      });

      try {
        const updatedProduct = await updateProduct(
          id,
          input,
        );

        set((state) => ({
          products: state.products.map((product) =>
            product.id === id
              ? updatedProduct
              : product,
          ),
          selectedProduct: updatedProduct,
          isSubmitting: false,
        }));

        return updatedProduct;
      } catch (error) {
        set({
          isSubmitting: false,
          error: getErrorMessage(error),
        });

        throw error;
      }
    },

    removeProduct: async (id) => {
      set({
        isSubmitting: true,
        error: null,
      });

      try {
        await deleteProduct(id);

        set((state) => ({
          products: state.products.filter(
            (product) => product.id !== id,
          ),
          selectedProduct:
            state.selectedProduct?.id === id
              ? null
              : state.selectedProduct,
          total: Math.max(0, state.total - 1),
          isSubmitting: false,
        }));
      } catch (error) {
        set({
          isSubmitting: false,
          error: getErrorMessage(error),
        });

        throw error;
      }
    },
  }));
```

---

## 5. Validation Schema

```ts
import { z } from 'zod';

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên sản phẩm là bắt buộc')
    .max(100, 'Tên không được vượt quá 100 ký tự'),

  price: z
    .number({
      message: 'Giá phải là số',
    })
    .min(0, 'Giá không được nhỏ hơn 0'),

  description: z
    .string()
    .max(500, 'Mô tả không được vượt quá 500 ký tự')
    .optional(),

  status: z.enum(['active', 'inactive']),
});

export type ProductFormValues =
  z.infer<typeof productSchema>;
```

---

## 6. Product Form

Form được dùng chung cho Create và Update.

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  productSchema,
  type ProductFormValues,
} from '../product.schema';

interface ProductFormProps {
  defaultValues?: ProductFormValues;
  isSubmitting?: boolean;
  onSubmit: (
    values: ProductFormValues,
  ) => Promise<void> | void;
}

export function ProductForm({
  defaultValues,
  isSubmitting = false,
  onSubmit,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues ?? {
      name: '',
      price: 0,
      description: '',
      status: 'active',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">
          Tên sản phẩm
        </label>

        <input
          id="name"
          {...register('name')}
        />

        {errors.name && (
          <p role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="price">Giá</label>

        <input
          id="price"
          type="number"
          {...register('price', {
            valueAsNumber: true,
          })}
        />

        {errors.price && (
          <p role="alert">
            {errors.price.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="description">
          Mô tả
        </label>

        <textarea
          id="description"
          {...register('description')}
        />
      </div>

      <div>
        <label htmlFor="status">
          Trạng thái
        </label>

        <select
          id="status"
          {...register('status')}
        >
          <option value="active">
            Hoạt động
          </option>

          <option value="inactive">
            Tạm ngưng
          </option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? 'Đang lưu...'
          : 'Lưu'}
      </button>
    </form>
  );
}
```

---

## 7. Trang danh sách

Chỉ subscribe các state cần thiết để hạn chế render lại.

```tsx
import { useEffect } from 'react';
import { useProductStore } from '../stores/product.store';
import { DeleteProductButton } from '../components/DeleteProductButton';

export function ProductListPage() {
  const products = useProductStore(
    (state) => state.products,
  );

  const page = useProductStore(
    (state) => state.page,
  );

  const search = useProductStore(
    (state) => state.search,
  );

  const isLoading = useProductStore(
    (state) => state.isLoading,
  );

  const error = useProductStore(
    (state) => state.error,
  );

  const setPage = useProductStore(
    (state) => state.setPage,
  );

  const setSearch = useProductStore(
    (state) => state.setSearch,
  );

  const fetchProducts = useProductStore(
    (state) => state.fetchProducts,
  );

  useEffect(() => {
    void fetchProducts();
  }, [page, search, fetchProducts]);

  if (isLoading) {
    return <p>Đang tải dữ liệu...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <section>
      <h1>Danh sách sản phẩm</h1>

      <input
        value={search}
        placeholder="Tìm kiếm sản phẩm"
        onChange={(event) => {
          setSearch(event.target.value);
        }}
      />

      {products.length === 0 ? (
        <p>Không có sản phẩm.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Giá</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.price}</td>
                <td>{product.status}</td>

                <td>
                  <button type="button">
                    Sửa
                  </button>

                  <DeleteProductButton
                    id={product.id}
                    name={product.name}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        type="button"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Trang trước
      </button>

      <button
        type="button"
        onClick={() => setPage(page + 1)}
      >
        Trang sau
      </button>
    </section>
  );
}
```

---

## 8. Trang Create

```tsx
import { useNavigate } from 'react-router-dom';
import { ProductForm } from '../components/ProductForm';
import { useProductStore } from '../stores/product.store';

export function ProductCreatePage() {
  const navigate = useNavigate();

  const addProduct = useProductStore(
    (state) => state.addProduct,
  );

  const isSubmitting = useProductStore(
    (state) => state.isSubmitting,
  );

  const error = useProductStore(
    (state) => state.error,
  );

  return (
    <section>
      <h1>Thêm sản phẩm</h1>

      <ProductForm
        isSubmitting={isSubmitting}
        onSubmit={async (values) => {
          try {
            await addProduct(values);
            navigate('/products');
          } catch {
            // Store đã lưu error.
          }
        }}
      />

      {error && (
        <p role="alert">{error}</p>
      )}
    </section>
  );
}
```

---

## 9. Trang Update

```tsx
import { useEffect } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import { ProductForm } from '../components/ProductForm';
import { useProductStore } from '../stores/product.store';

export function ProductEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const product = useProductStore(
    (state) => state.selectedProduct,
  );

  const isLoading = useProductStore(
    (state) => state.isLoading,
  );

  const isSubmitting = useProductStore(
    (state) => state.isSubmitting,
  );

  const error = useProductStore(
    (state) => state.error,
  );

  const fetchProductById = useProductStore(
    (state) => state.fetchProductById,
  );

  const editProduct = useProductStore(
    (state) => state.editProduct,
  );

  const clearSelectedProduct = useProductStore(
    (state) => state.clearSelectedProduct,
  );

  useEffect(() => {
    void fetchProductById(id);

    return () => {
      clearSelectedProduct();
    };
  }, [
    id,
    fetchProductById,
    clearSelectedProduct,
  ]);

  if (isLoading) {
    return <p>Đang tải sản phẩm...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!product) {
    return <p>Không tìm thấy sản phẩm.</p>;
  }

  return (
    <section>
      <h1>Cập nhật sản phẩm</h1>

      <ProductForm
        defaultValues={{
          name: product.name,
          price: product.price,
          description:
            product.description ?? '',
          status: product.status,
        }}
        isSubmitting={isSubmitting}
        onSubmit={async (values) => {
          try {
            await editProduct(id, values);
            navigate('/products');
          } catch {
            // Store đã lưu error.
          }
        }}
      />
    </section>
  );
}
```

---

## 10. Xử lý Delete

```tsx
import { useProductStore } from '../stores/product.store';

interface DeleteProductButtonProps {
  id: string;
  name: string;
}

export function DeleteProductButton({
  id,
  name,
}: DeleteProductButtonProps) {
  const removeProduct = useProductStore(
    (state) => state.removeProduct,
  );

  const isSubmitting = useProductStore(
    (state) => state.isSubmitting,
  );

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa "${name}" không?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await removeProduct(id);
    } catch {
      // Store đã lưu error.
    }
  };

  return (
    <button
      type="button"
      disabled={isSubmitting}
      onClick={() => void handleDelete()}
    >
      {isSubmitting
        ? 'Đang xử lý...'
        : 'Xóa'}
    </button>
  );
}
```

---

## 11. Nguyên tắc sử dụng Zustand

- Store quản lý state và action của feature.
- Component không gọi API trực tiếp.
- Không lưu state của form vào Zustand nếu chỉ dùng trong một form.
- Form local state do React Hook Form quản lý.
- Chỉ đưa filter vào store khi nhiều component cùng sử dụng.
- Không sử dụng một `isSubmitting` chung nếu nhiều bản ghi có thể thao tác đồng thời.
- Subscribe từng state riêng để giảm render lại.
- Reset state khi rời khỏi trang nếu dữ liệu không còn cần thiết.
- Luôn xử lý lỗi và khôi phục trạng thái loading bằng `try/catch`.

Ví dụ state xóa theo từng sản phẩm:

```ts
interface ProductState {
  deletingId: string | null;
}
```

Điều này tốt hơn `isSubmitting` chung khi danh sách có nhiều nút xóa.

---

## 12. Checklist hoàn thành

- [ ] Có type cho entity, input và response
- [ ] API được tách khỏi component
- [ ] Zustand store chứa CRUD actions
- [ ] Không lưu form state không cần thiết vào store
- [ ] Form sử dụng React Hook Form và Zod
- [ ] Create và Update dùng chung form
- [ ] Có loading, error và empty state
- [ ] Có xác nhận trước khi xóa
- [ ] Không submit nhiều lần
- [ ] Danh sách được đồng bộ sau Create
- [ ] Danh sách được đồng bộ sau Update
- [ ] Danh sách được đồng bộ sau Delete
- [ ] Có xử lý pagination, search và filter
- [ ] Có kiểm tra quyền
- [ ] Không sử dụng `any` không cần thiết
- [ ] Chạy thành công lint, type-check và build
