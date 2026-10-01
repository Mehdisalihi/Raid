import { PrismaClient } from '@prisma/client';

// Single shared Prisma instance for the entire application.
// Avoids connection pool exhaustion from multiple PrismaClient instances.
const prisma = new PrismaClient();

export default prisma;
