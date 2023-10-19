import { PrismaClient, User } from '@prisma/client';
import { Key } from './types';

const prisma = new PrismaClient();

export function exclude(user: User, keys: Key[]): any {
  return Object.fromEntries(
    Object.entries(user).filter(([key]) => !keys.includes(key as any))
  );
}
