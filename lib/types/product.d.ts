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

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  brandId: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductsResponse {
  data: (Product & {
    brand: Brand | null;
    category: Category | null;
  })[];
  meta: PaginationMeta;
}
