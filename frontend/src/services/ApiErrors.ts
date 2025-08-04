// API Error Type Hierarchy
// This file defines a comprehensive error type system for API responses and network issues.

export class ApiError extends Error {
  constructor(
    message: string,
    public details?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string, public url?: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string, details?: string) {
    super(message, details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ServerError extends ApiError {
  constructor(message: string, details?: string) {
    super(message, details);
    this.name = 'ServerError';
  }
}