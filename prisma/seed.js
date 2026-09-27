const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const POST_COUNT = 25; // enough to span multiple pages at the default limit of 10
const COMMENTS_PER_POST = 3;

async function main() {
  console.log('Seeding database with test data for pagination testing...');

  const hashed = await bcrypt.hash('password123', 10);

  const author = await prisma.user.upsert({
    where: { email: 'seed@example.com' },
    update: {},
    create: { name: 'Seed Author', email: 'seed@example.com', password: hashed },
  });

  for (let i = 1; i <= POST_COUNT; i++) {
    const post = await prisma.post.create({
      data: {
        title: `Seeded Post #${i}`,
        content: `This is the body of seeded post number ${i}, generated to help test pagination on GET /api/posts.`,
        published: true,
        authorId: author.id,
      },
    });

    for (let c = 1; c <= COMMENTS_PER_POST; c++) {
      await prisma.comment.create({
        data: {
          text: `Seeded comment #${c} on post #${i}`,
          postId: post.id,
          authorId: author.id,
        },
      });
    }
  }

  console.log(`Done. Created ${POST_COUNT} posts with ${COMMENTS_PER_POST} comments each.`);
  console.log(`Log in with email: seed@example.com / password: password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });