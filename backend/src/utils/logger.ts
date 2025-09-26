import winston from 'winston';
import { Request, Response } from 'express';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({ filename: 'logs/all.log' }),
];

// Create the logger
const winstonLogger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Audit trail logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/audit.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Security event logger
const securityLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Payment event logger
const paymentLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/payments.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Logger utility functions
export class Logger {
  // General logging
  static info(message: string, meta?: any) {
    winstonLogger.info(message, meta);
  }

  static warn(message: string, meta?: any) {
    winstonLogger.warn(message, meta);
  }

  static error(message: string, meta?: any) {
    winstonLogger.error(message, meta);
  }

  static debug(message: string, meta?: any) {
    winstonLogger.debug(message, meta);
  }

  // HTTP request logging
  static http(req: Request, res: Response, responseTime?: number) {
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      userType: (req as any).user?.userType
    };

    winstonLogger.http(`${req.method} ${req.url} ${res.statusCode}`, logData);
  }

  // Audit trail logging
  static audit(action: string, userId: string, userType: string, details: any) {
    const auditData = {
      action,
      userId,
      userType,
      timestamp: new Date().toISOString(),
      ip: 'N/A', // Will be set by middleware
      details
    };

    auditLogger.info('AUDIT_TRAIL', auditData);
  }

  // Security event logging
  static security(event: string, details: any, severity: 'low' | 'medium' | 'high' = 'medium') {
    const securityData = {
      event,
      severity,
      timestamp: new Date().toISOString(),
      details
    };

    securityLogger.warn('SECURITY_EVENT', securityData);
  }

  // Payment event logging
  static payment(event: string, details: any) {
    const paymentData = {
      event,
      timestamp: new Date().toISOString(),
      details
    };

    paymentLogger.info('PAYMENT_EVENT', paymentData);
  }

  // User action logging
  static userAction(action: string, userId: string, userType: string, details: any) {
    const actionData = {
      action,
      userId,
      userType,
      timestamp: new Date().toISOString(),
      details
    };

    auditLogger.info('USER_ACTION', actionData);
  }

  // Admin action logging
  static adminAction(action: string, adminId: string, targetType: string, targetId: string, details: any) {
    const adminData = {
      action,
      adminId,
      targetType,
      targetId,
      timestamp: new Date().toISOString(),
      details
    };

    auditLogger.info('ADMIN_ACTION', adminData);
  }

  // Donation event logging
  static donation(event: string, donationId: string, amount: number, donorId: string, studentId: string, details: any) {
    const donationData = {
      event,
      donationId,
      amount,
      donorId,
      studentId,
      timestamp: new Date().toISOString(),
      details
    };

    paymentLogger.info('DONATION_EVENT', donationData);
  }

  // Error logging with context
  static errorWithContext(message: string, error: Error, context: any) {
    const errorData = {
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    };

    winstonLogger.error(message, errorData);
  }

  // Performance logging
  static performance(operation: string, duration: number, details: any) {
    const perfData = {
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      details
    };

    winstonLogger.info('PERFORMANCE', perfData);
  }

  // Database operation logging
  static database(operation: string, table: string, duration: number, details: any) {
    const dbData = {
      operation,
      table,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      details
    };

    winstonLogger.debug('DATABASE_OPERATION', dbData);
  }

  // API endpoint logging
  static apiEndpoint(method: string, endpoint: string, statusCode: number, duration: number, userId?: string) {
    const apiData = {
      method,
      endpoint,
      statusCode,
      duration: `${duration}ms`,
      userId,
      timestamp: new Date().toISOString()
    };

    winstonLogger.http(`${method} ${endpoint} ${statusCode}`, apiData);
  }

  // Authentication logging
  static authentication(event: string, userId: string, userType: string, success: boolean, details: any) {
    const authData = {
      event,
      userId,
      userType,
      success,
      timestamp: new Date().toISOString(),
      details
    };

    if (success) {
      auditLogger.info('AUTHENTICATION_SUCCESS', authData);
    } else {
      securityLogger.warn('AUTHENTICATION_FAILURE', authData);
    }
  }

  // File upload logging
  static fileUpload(fileName: string, fileSize: number, userId: string, userType: string, success: boolean) {
    const uploadData = {
      fileName,
      fileSize: `${fileSize} bytes`,
      userId,
      userType,
      success,
      timestamp: new Date().toISOString()
    };

    if (success) {
      auditLogger.info('FILE_UPLOAD_SUCCESS', uploadData);
    } else {
      securityLogger.warn('FILE_UPLOAD_FAILURE', uploadData);
    }
  }
}

// Middleware for automatic request logging
export const requestLogger = (req: Request, res: Response, next: Function) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.http(req, res, duration);
  });

  next();
};

// Middleware for IP address extraction
export const ipLogger = (req: Request, res: Response, next: Function) => {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  (req as any).clientIp = ip;
  next();
};

// Maintain backward compatibility
const logger = {
  info: Logger.info,
  warn: Logger.warn,
  error: Logger.error,
  debug: Logger.debug,
  http: Logger.http
};

export { logger };
export default logger; 