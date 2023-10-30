import { Response, NextFunction } from 'express';
import JWT, { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { Request } from '../utils/interfaces';
import { exclude } from '../utils/functions';

const prisma = new PrismaClient();

export const privacy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { token: jwt } = req.cookies;
  const { username } = req.params;

  try {
    const profile = await prisma.user.findUnique({
      where: {
        username,
      },
      select: {
        privacy: true,
        username: true,
      },
    });

    if (profile?.privacy === 'PRIVATE' && jwt) {
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

      if (matchCredentials1) {
        res.status(401);
        throw new Error('Not authorized, access denied');
      }

      req.user = userWithoutPassword;

      const userAccount = await prisma.user.findUnique({
        where: {
          username,
        },
        include: {
          followers: {
            select: {
              status: true,
              followerName: true,
            },
          },
          following: {
            select: {
              status: true,
              followerName: true,
            },
          },
        },
      });

      const friendship = await prisma.follows.findFirst({
        where: {
          followerName: req.user?.username,
        },
        select: {
          followingName: true,
          status: true,
        },
      });

      const accountIsPrivate = userAccount?.privacy === 'PRIVATE';
      const approvedFollower = friendship?.status === 'ACCEPTED';
      const isUser = userAccount?.id === req.user?.id;

      if (accountIsPrivate && !isUser && !approvedFollower) {
        return res
          .status(403)
          .json({ success: false, message: 'User is private' });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};
