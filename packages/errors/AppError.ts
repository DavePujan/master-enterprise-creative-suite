/**
 * Standard Application Error Hierarchy.
 * Framework-free: MUST NOT import React, Firebase, Express, or vendor SDKs.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Permission denied") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class QuotaExceededError extends AppError {
  public readonly retryDelay?: string;
  constructor(message = "API Quota exceeded", retryDelay?: string) {
    super(message, 429);
    this.retryDelay = retryDelay;
  }
}

export class ExternalServiceError extends AppError {
  public readonly provider: string;
  constructor(provider: string, message: string, statusCode = 502) {
    super(`[${provider}] ${message}`, statusCode);
    this.provider = provider;
  }
}
