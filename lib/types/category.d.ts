interface CategoryItem {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  products: Product[];
}

interface CategoryCreateInput {
  name: string;
}

interface CategoryUpdateInput {
  name?: string;
}

interface CategoryResponse {
  data: CategoryItem[];
  meta: PaginationMeta;
}
