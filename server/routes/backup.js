import { Router } from 'express';
import prisma from '../db/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 导出用户数据
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户的所有数据
    const [projects, tasks] = await Promise.all([
      prisma.project.findMany({ where: { userId } }),
      prisma.task.findMany({ where: { userId } })
    ]);
    
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user: {
        username: req.user.username,
        email: req.user.email
      },
      data: {
        projects: projects.map(p => ({
          id: p.id,
          title: p.title,
          name: p.name,
          description: p.description,
          createdAt: p.createdAt
        })),
        tasks: tasks.map(t => ({
          id: t.id,
          projectId: t.projectId,
          title: t.title,
          description: t.description,
          columnStatus: t.columnStatus,
          dueDate: t.dueDate,
          priority: t.priority,
          completedAt: t.completedAt,
          subtasks: t.subtasks,
          tags: t.tags,
          chatHistory: t.chatHistory,
          createdAt: t.createdAt
        }))
      }
    };
    
    res.json(exportData);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

// 导入用户数据
router.post('/import', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, mode = 'merge' } = req.body;
    
    if (!data || !data.projects || !data.tasks) {
      return res.status(400).json({ error: '无效的备份数据' });
    }
    
    // 如果是覆盖模式，先删除现有数据
    if (mode === 'replace') {
      await prisma.task.deleteMany({ where: { userId } });
      await prisma.project.deleteMany({ where: { userId } });
    }
    
    // 创建项目ID映射（旧ID -> 新ID）
    const projectIdMap = new Map();
    
    // 导入项目
    for (const project of data.projects) {
      const created = await prisma.project.create({
        data: {
          userId,
          title: project.title,
          name: project.name,
          description: project.description
        }
      });
      projectIdMap.set(project.id, created.id);
    }
    
    // 导入任务
    let taskCount = 0;
    for (const task of data.tasks) {
      const newProjectId = task.projectId ? projectIdMap.get(task.projectId) : null;
      
      await prisma.task.create({
        data: {
          userId,
          projectId: newProjectId,
          title: task.title,
          description: task.description || '',
          columnStatus: task.columnStatus || 'todo',
          dueDate: task.dueDate,
          priority: task.priority || 'p2',
          completedAt: task.completedAt,
          subtasks: task.subtasks || '[]',
          tags: task.tags || '[]',
          chatHistory: task.chatHistory || '[]'
        }
      });
      taskCount++;
    }
    
    res.json({
      message: '导入成功',
      imported: {
        projects: data.projects.length,
        tasks: taskCount
      }
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: '导入失败: ' + err.message });
  }
});

export default router;
