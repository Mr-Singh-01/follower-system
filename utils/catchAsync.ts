import { Response, NextFunction } from 'express';
import { Request } from './interfaces';

export const catchAsync = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  }; 
};
