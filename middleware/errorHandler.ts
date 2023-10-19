import express, { NextFunction, Request, Response } from 'express';
import { StatusError } from '../utils/interfaces';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const err = new Error(
    `${req.method} ${req.originalUrl} not found`
  ) as StatusError;

  err['status'] = 404;
  next(err);
};

export const errorHandler = (
  err: StatusError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(err.message);
  res.status(err['status'] || 500);
  res.json({ error: err.message });
};
