const { PrismaClient } = require('@prisma/client');

// Render runs this as a single long-lived process, so a plain singleton is enough
// to avoid creating multiple Prisma Client instances during dev hot-reloads.
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;