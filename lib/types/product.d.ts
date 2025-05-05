interface ProductCreateInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  brandId: string;
  categoryId: string;
}

interface ProductUpdateInput {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
  brandId?: string;
  categoryId?: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProductsResponse {
  data: (Product & {
    brand: Brand | null;
    category: Category | null;
  })[];
  meta: PaginationMeta;
}
