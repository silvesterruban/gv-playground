import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/index';

export class JWTUtils {
  static generateToken(payload: any): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as any);
  }

  static verifyToken(token: string): any {
    try {
      console.log('🔐 [JWT UTILS] Verifying token with secret:', config.jwt.secret);
      console.log('🔐 [JWT UTILS] Token to verify:', token.substring(0, 50) + '...');
      
      const decoded = jwt.verify(token, config.jwt.secret);
      console.log('🔐 [JWT UTILS] Token verified successfully:', decoded);
      return decoded;
    } catch (error) {
      console.log('🔐 [JWT UTILS] Token verification failed:', error);
      throw new Error('Invalid token');
    }
  }
} 