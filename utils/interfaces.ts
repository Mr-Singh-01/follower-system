import { Request as ExpressRequest } from 'express';
import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

export interface SearchOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface StatusError extends Error {
  status?: number;
}

export interface Request extends ExpressRequest {
  user?: User;
}
