export interface LoginRequest {
  username: string; 
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  username: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthUserResponse {
  id: string;
  username: string;
  email: string;
  name: string;
}
export interface GoogleLoginRequest {
  token: string;
}
export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: AuthUserResponse;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

export interface GenericAuthResponse {
  message: string;
}