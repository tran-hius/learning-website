/** Generic repository contract: every concrete repository implements this. */
export interface IBaseRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findMany(options: { page: number; limit: number }): Promise<{ items: T[]; total: number }>;
  create(data: Partial<T>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
}

/** Sample domain repository interface (Task 1 scaffold — implementation comes later). */
export interface IUserRepository extends IBaseRepository<{
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}> {
  findByEmail(email: string): Promise<{ id: string; email: string } | null>;
}
