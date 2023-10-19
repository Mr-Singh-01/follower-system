import JWT, { JwtPayload } from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';
import { Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { Request } from '../utils/interfaces';
import { exclude } from '../utils/functions';

const prisma = new PrismaClient();

const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token: jwt } = req.cookies;

    if (jwt) {
      try {
        const decoded = JWT.verify(jwt, process.env.JWT_SECRET!) as JwtPayload;

        const matchUser = await prisma.user.findUnique({
          where: {
            id: String(decoded?.userId),
          },
          include: {
            followers: true,
            following: true,
          },
        });

        if (!matchUser) {
          res.status(401);
          throw new Error('Please login');
        }

        type MatchUser = typeof matchUser;

        const userWithoutPassword = exclude(matchUser, ['password']);

        const matchCredentials1 = decoded?.userId !== matchUser.id;
        const matchCredentials2 = userWithoutPassword.role !== 'ADMIN';

        if (matchCredentials1 && matchCredentials2) {
          res.status(401);
          throw new Error('Not authorized, access denied');
        }

        req.user = userWithoutPassword;

        next();
      } catch (err) {
        console.error(err);
        res.status(401);
        next(err);
        return;
      }
    } else {
      res.status(401);
      throw new Error('Please login');
    }
  }
);

export { protect };
