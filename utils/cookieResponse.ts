import { User } from '@prisma/client';
import { Response } from 'express';
import { getJwtToken } from './getJwtToken';

export const cookieResponse = (user: User, res: Response): string => {
  const token = getJwtToken(user.id);

  const options: any = {
    expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  user.password = undefined!;

  res.status(200).cookie('token', token, options).json({
    success: true,
    token,
    user,
  });

  return token;
};
