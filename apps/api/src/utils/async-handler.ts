import { Request, Response, NextFunction } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps an async route handler so rejected promises are forwarded to the
 * Express error middleware. Required on Express 4, which only catches
 * synchronous throws — without this, a rejection hangs the request and
 * surfaces as an unhandled rejection that can crash the process.
 */
export const asyncHandler = (fn: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
