// backend/src/types/auth.ts - Updated with donor support
import { Request } from 'express';

export interface LoginRequest {
  email: string;
  password: string;
  userType: 'student' | 'admin' | 'donor'; // Added 'donor'
}

export interface StudentRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  school: string;
  major?: string;
}

export interface AdminRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'moderator' | 'support';
}

// NEW: Donor registration request
export interface DonorRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

// Payload for creating JWT tokens (what you pass to generateToken)
export interface JWTTokenPayload {
  id: string; // Use 'id' for all user types
  email: string;
  userType: 'student' | 'admin' | 'donor';
  verified: boolean;
  role?: string; // Optional for admin roles
}

// Complete JWT payload (what comes back from verifyToken)
export interface JWTPayload extends JWTTokenPayload {
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  type?: 'access' | 'refresh'; // Add this for token type distinction
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: 'student' | 'admin' | 'donor'; // Added 'donor'
    verified?: boolean;
    role?: string;
  };
  message?: string;
  expiresIn?: number;
  verificationToken?: string;
  requiresPayment?: boolean;
  registrationData?: any; // Temporary registration data
}

export interface ForgotPasswordRequest {
  email: string;
  userType: 'student' | 'admin' | 'donor'; // Added 'donor'
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// NEW: Authenticated request type
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    userType: 'student' | 'admin' | 'donor';
    verified: boolean;
    role?: string;
  };
}