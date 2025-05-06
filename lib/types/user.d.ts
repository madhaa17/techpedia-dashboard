interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserResponse {
  data: User[];
  meta: PaginationMeta;
}
