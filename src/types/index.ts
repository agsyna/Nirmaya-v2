export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  error: string;
  statusCode: number;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public error?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export interface AuthUser {
  id: string;
  clinicId: string;
  role: "admin" | "receptionist";
}
