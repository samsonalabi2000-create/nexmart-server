/**
 * Operational error with an HTTP status code.
 * Throw this anywhere in the app — the global error handler catches it.
 *
 * @example
 *   throw new AppError("Product not found", 404);
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode  = statusCode;
    this.isOperational = true;           // distinguishes from programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
