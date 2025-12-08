import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function test() {
  try {
    // 查询所有用户
    const users = await p.user.findMany();
    console.log('Users:', JSON.stringify(users.map(u => ({id: u.id, username: u.username, role: u.role})), null, 2));
    
    // 查询所有项目
    const projects = await p.project.findMany();
    console.log('Projects count:', projects.length);
    console.log('Projects:', JSON.stringify(projects, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
}

test();
