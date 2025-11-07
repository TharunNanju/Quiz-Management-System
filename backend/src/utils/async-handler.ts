import type { NextFunction, Request, RequestHandler, Response } from 'express';

type MaybePromise<T> = T | Promise<T>;

type AsyncCompatibleHandler<TReq extends Request = Request> = (
  req: TReq,
  res: Response,
  next: NextFunction
) => MaybePromise<unknown>;

export const asyncHandler = <TReq extends Request = Request>(
  handler: AsyncCompatibleHandler<TReq>
): RequestHandler => {
  return function asyncSafeHandler(req: Request, res: Response, next: NextFunction) {
    Promise.resolve(handler(req as TReq, res, next)).catch(next);
  };
};
