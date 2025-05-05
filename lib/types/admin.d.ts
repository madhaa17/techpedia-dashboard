interface CreateAdminRequest {
  name: string;
  email: string;
  password: string;
}

interface AdminResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}
