import { Response, NextFunction } from 'express';
import { PrismaClient, User } from '@prisma/client';
import { cookieResponse } from '../../utils/cookieResponse';
import { Request } from '../../utils/interfaces';
import { catchAsync } from '../../utils/catchAsync';
import { sendEmail } from '../../utils/sendEmail';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const registerUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username, email, password } = req.body;
    const salt = bcrypt.genSaltSync(13);
    const hash = await bcrypt.hash(password, salt);
    const verificationToken = uuidv4();

    const confirmEmailURL = `${req.protocol}://${req.get(
      'host'
    )}/auth/verifyemail?token=${verificationToken}`;

    const message = `Thank you for joining and welcome on board. 
    Please click the link to verify your email and engage autopilot. 
    Please click here: \n\n ${confirmEmailURL}`;

    try {
      const name = await prisma.user.findUnique({
        where: {
          username,
        },
      });

      const userEmail = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!username || !email || !password) {
        throw new Error('Please provide all fields');
      } else if (username === name?.username) {
        throw new Error('Username is already in use');
      } else if (email === userEmail?.email) {
        throw new Error('Email is already in use');
      }

      const user: User = await prisma.user.create({
        data: {
          username,
          email,
          password: hash,
          isEmailConfirmed: false,
          verificationToken: verificationToken,
        },
      });

      await sendEmail({
        email: email,
        subject: 'Verify Email',
        message,
      });

      cookieResponse(user, res);
      return;
    } catch (err) {
      next(err);
    }
  }
);

export const getAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          privacy: true,
          password: false,
        },
      });

      res
        .status(200)
        .json({ message: 'success', count: users.length, data: users });
    } catch (err) {
      next(err);
    }
  }
);

export const getUserProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req.params;

    try {
      const userProfile = await prisma.user.findUnique({
        where: {
          username,
        },
        select: {
          id: true,
          username: true,
          followers: {
            select: {
              followerName: true,
              followingName: false,
            },
          },
          following: {
            select: {
              followerName: false,
              followingName: true,
            },
          },
          email: true,
          password: false,
        },
      });

      res.status(200).json({ success: true, data: userProfile });
    } catch (err) {
      next(err);
    }
  }
);

export const deleteUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    try {
      const profile = await prisma.user.delete({
        where: {
          id: user?.id,
        },
        select: {
          username: true,
        },
      });

      res.status(200).json({
        success: true,
        message: `${user?.username} has been deleted from the database.`,
      });
      next();
    } catch (err) {
      next(err);
    }
  }
);

export const followUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req.params;
    let friendship;

    try {
      const follower = await prisma.user.findUnique({
        where: {
          id: req.user?.id,
        },
      });

      if (!follower) {
        throw new Error('Please login to follow user');
      }

      const following = await prisma.user.findUnique({
        where: {
          username,
        },
      });

      if (!following) {
        return res.status(400).json({
          success: false,
          message: 'User not found',
        });
      }

      const isFollowing = await prisma.follows.findFirst({
        where: {
          followerName: follower.username,
          followingName: following.username,
        },
      });

      if (isFollowing) {
        return res.status(400).json({
          success: false,
          message: `You are already following ${username}`,
        });
      }

      if (following.privacy === 'PRIVATE') {
        friendship = await prisma.follows.create({
          data: {
            follower: {
              connect: { username: follower.username },
            },
            following: {
              connect: { username: following.username },
            },
            accepted: false,
            status: 'PENDING',
          },
        });

        return res.status(200).json({
          success: true,
          message: `Follow request sent to ${username}`,
        });
      } else {
        friendship = await prisma.follows.create({
          data: {
            follower: {
              connect: { username: follower.username },
            },
            following: {
              connect: { username: following.username },
            },
            accepted: true,
            status: 'ACCEPTED',
          },
        });

        return res.status(200).json({
          success: true,
          message: `Following ${username}`,
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

export const getFollowRequest = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let result;

    try {
      const pendingFollowRequests = await prisma.follows.findMany({
        where: {
          followingName: req.user?.username,
          status: 'PENDING',
        },
        select: {
          followerName: true,
        },
      });

      if (pendingFollowRequests.length === 0) {
        result = 'You have 0 follow request pending';
      } else {
        result = pendingFollowRequests;
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

export const unfollowUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req.params;

    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user?.id,
        },
      });

      if (!user) {
        throw new Error('Please login to unfollow user');
      }

      const following = await prisma.user.findUnique({
        where: {
          username,
        },
      });

      if (!following) {
        return res.status(400).json({
          success: false,
          message: 'User not found',
        });
      }

      await prisma.follows.deleteMany({
        where: {
          followerName: user.username,
          followingName: following.username,
        },
      });

      return res.status(200).json({
        success: true,
        message: `Unfollowed ${username}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

export const approveFollowRequest = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username, approval } = req.body;
    const accepted = approval.toUpperCase() === 'ACCEPTED';
    const choice = approval.toUpperCase();

    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user?.id,
        },
        select: {
          username: true,
          followers: true,
          following: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Please login',
        });
      }

      const pendingFriendships = await prisma.follows.findMany({
        where: {
          followingName: req.user?.username,
        },
        select: {
          status: true,
          followingName: true,
          followerName: true,
        },
      });

      if (!pendingFriendships?.length) {
        return res.status(200).json({
          success: true,
          message: 'No pending follow requests',
        });
      }

      const updateRequest = await prisma.follows.update({
        where: {
          followerName_followingName: {
            followerName: username,
            followingName: String(req.user?.username),
          },
        },
        data: {
          accepted: accepted,
          status: choice,
        },
      });

      if (
        updateRequest.accepted === false &&
        updateRequest.status === 'DECLINED'
      ) {
        await prisma.follows.delete({
          where: {
            followerName_followingName: {
              followerName: username,
              followingName: String(req.user?.username),
            },
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: `You have ${approval} follow request from ${username}`,
        data: updateRequest,
      });
    } catch (err) {
      next(err);
    }
  }
);

export const deleteUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await prisma.user.deleteMany();

    res.status(200).json({
      success: true,
      message: 'databased wiped',
    });
  }
);
