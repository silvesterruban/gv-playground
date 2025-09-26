import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { JWTPayload, JWTTokenPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class JWTUtils {
  // Generate access token - FIXED to use JWTTokenPayload
  static generateToken(payload: JWTTokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'village-platform',
      audience: 'village-users'
    } as SignOptions);
  }

  // Generate refresh token - FIXED to use JWTTokenPayload
  static generateRefreshToken(payload: JWTTokenPayload): string {
    const refreshPayload = { ...payload, type: 'refresh' };

    return jwt.sign(refreshPayload, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'village-platform',
      audience: 'village-users'
    } as SignOptions);
  }

  static verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'village-platform',
        audience: 'village-users'
      }) as JwtPayload;

      return {
        id: decoded.id as string,
        email: decoded.email as string,
        userType: decoded.userType as 'student' | 'admin' | 'donor',
        role: decoded.role as string,
        verified: decoded.verified as boolean,
        iat: decoded.iat as number,
        exp: decoded.exp as number,
        aud: decoded.aud as string,
        iss: decoded.iss as string,
        type: decoded.type as 'access' | 'refresh' | undefined
      } as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'village-platform',
        audience: 'village-users'
      }) as JwtPayload & { type: string };

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Return clean payload
      return {
        id: decoded.id as string,
        email: decoded.email as string,
        userType: decoded.userType as 'student' | 'admin' | 'donor',
        role: decoded.role as string,
        verified: decoded.verified as boolean,
        iat: decoded.iat as number,
        exp: decoded.exp as number,
        aud: decoded.aud as string,
        iss: decoded.iss as string,
        type: decoded.type as 'access' | 'refresh' | undefined
      } as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Refresh token verification failed');
      }
    }
  }

  static generateEmailVerificationToken(email: string, userType: string): string {
    const payload = { email, userType, type: 'email_verification' };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '24h',
      issuer: 'village-platform',
      audience: 'village-verification'
    } as SignOptions);
  }

  static verifyEmailVerificationToken(token: string): { email: string; userType: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'village-platform',
        audience: 'village-verification'
      }) as JwtPayload & { email: string; userType: string; type: string };

      if (decoded.type !== 'email_verification') {
        throw new Error('Invalid verification token');
      }

      return { email: decoded.email, userType: decoded.userType };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Verification token expired');
      } else {
        throw new Error('Invalid verification token');
      }
    }
  }

  static generatePasswordResetToken(email: string, userType: string): string {
    const payload = { email, userType, type: 'password_reset' };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '1h',
      issuer: 'village-platform',
      audience: 'village-reset'
    } as SignOptions);
  }

  static verifyPasswordResetToken(token: string): { email: string; userType: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'village-platform',
        audience: 'village-reset'
      }) as JwtPayload & { email: string; userType: string; type: string };

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid reset token');
      }

      return { email: decoded.email, userType: decoded.userType };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Reset token expired');
      } else {
        throw new Error('Invalid reset token');
      }
    }
  }

  // FIXED: Renamed from getTokenExpiration to match your authService usage
  static getTokenExpiration(): number {
    // Parse JWT_EXPIRES_IN to get expiration in seconds
    const expiresIn = JWT_EXPIRES_IN;
    if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn.slice(0, -1)) * 3600;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn.slice(0, -1)) * 86400;
    } else if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn.slice(0, -1)) * 60;
    } else {
      return parseInt(expiresIn); // Assume seconds
    }
  }

  // Additional utility methods
  static getTokenExpiry(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded?.exp ? new Date(decoded.exp * 1000) : null;
    } catch {
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    return expiry ? expiry < new Date() : true;
  }
}