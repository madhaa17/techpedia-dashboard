interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
}
