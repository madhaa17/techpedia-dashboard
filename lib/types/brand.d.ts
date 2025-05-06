interface BrandItem {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  products: Product[];
}

interface BrandCreateInput {
  name: string;
}

interface BrandUpdateInput {
  name?: string;
}

interface BrandResponse {
  data: BrandItem[];
  meta: PaginationMeta;
}
