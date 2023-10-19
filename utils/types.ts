import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

export type Key = keyof User;
