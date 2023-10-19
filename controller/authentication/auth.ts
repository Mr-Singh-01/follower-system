import { NextFunction, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { cookieResponse } from '../../utils/cookieResponse';
import { Request } from '../../utils/interfaces';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      throw new Error('Please enter both username and password!');
    }

    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (!user) {
      throw new Error(`${username} not found!`);
    }

    if (!user.isEmailConfirmed) {
      throw new Error('Please verify email!');
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new Error('Incorrect password, please try again!');
    }

    // Call your cookieResponse function with the user object
    cookieResponse(user as any, res);
  } catch (err) {
    next(err);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    res.status(200).json({
      success: true,
      message: 'Logged out',
    });
  } catch (err) {
    next(err);
  }
};

export const userPrivacy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { privacy } = req.body;
  const descretion = privacy.toUpperCase();

  try {
    if (!req.user?.privacy === privacy) {
      throw new Error(`Users profile is already ${privacy}`);
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: req.user?.id,
      },
      data: {
        privacy: descretion,
      },
    });

    if (updatedUser.privacy === 'PUBLIC') {
      // Automatically accept pending follow requests for public accounts
      await prisma.follows.updateMany({
        where: {
          followingName: req.user?.username,
          status: 'PENDING',
        },
        data: {
          accepted: true,
          status: 'ACCEPTED',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `Users profile is now set to ${privacy}`,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { token } = req.query;

  try {
    if (!token) {
      throw new Error('Missing verification token');
    }

    const verification = await prisma.user.findFirst({
      where: {
        verificationToken: token.toString(),
      },
    });

    if (!verification) {
      throw new Error('Invalid verification token');
    }

    if (verification.isEmailConfirmed) {
      return res.status(200).json({
        message: 'Email is already verified.',
      });
    }

    const user = await prisma.user.update({
      where: {
        id: verification.id,
      },
      data: {
        verificationToken: null,
        isEmailConfirmed: true,
      },
    });

    cookieResponse(user, res);
  } catch (err) {
    next(err);
  }
};
