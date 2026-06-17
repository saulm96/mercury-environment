export interface User {
  id: string;
  email: string;
  name: string | null;
  provider: string | null;
  providerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
