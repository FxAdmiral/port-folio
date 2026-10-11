const prisma = require('../lib/prisma');

/**
 * Data-access layer for the User table.
 * Every Prisma call for users lives here — controllers never talk to
 * prisma.user directly, they call these functions instead.
 */

function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

function findById(id) {
  return prisma.user.findUnique({ where: { id } });
}

// Returns a user without the password field — used wherever a user object
// is sent back in an API response.
function findSafeById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, createdAt: true },
  });
}

function createUser({ name, email, password }) {
  return prisma.user.create({
    data: { name, email, password },
    select: { id: true, name: true, email: true, createdAt: true },
  });
}

module.exports = { findByEmail, findById, findSafeById, createUser };