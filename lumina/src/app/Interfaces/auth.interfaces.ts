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

export interface VerifyRegistrationRequest {
  email: string;
  otpCode: string;
  name: string;
  username: string;
  password: string;
}

export interface ResendRegistrationOtpRequest {
  email: string;
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
  id: string | 999;
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

export interface SendOtpResponse {
  message: string;
}

export interface VerifyRegistrationResponse {
  message: string;
  token: string;
  expiresIn: number;
  user: AuthUserResponse;
}

export interface ResendOtpResponse {
  message: string;
}

export interface GenericAuthResponse {
  message: string;
}
