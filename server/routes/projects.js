import { Router } from 'express';
import prisma from '../db/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 获取用户的所有项目
router.get('/', authMiddleware, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { 
        OR: [
          { userId: req.user.id },
          { ownerId: req.user.id }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const normalized = projects.map(p => ({
      id: p.id,
      title: p.title || p.name || '',
      description: p.description || '',
      userId: p.userId || p.ownerId,
      createdAt: p.createdAt
    }));
    res.json(normalized);
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 创建项目
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    
    const project = await prisma.project.create({
      data: {
        userId: req.user.id,
        title,
        description: description || ''
      }
    });
    
    res.json({ 
      id: project.id, 
      userId: project.userId, 
      title: project.title, 
      description: project.description || '' 
    });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 更新项目
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    
    const project = await prisma.project.findFirst({
      where: { 
        id: parseInt(req.params.id),
        OR: [
          { userId: req.user.id },
          { ownerId: req.user.id }
        ]
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    await prisma.project.update({
      where: { id: parseInt(req.params.id) },
      data: { title, description }
    });
    
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 删除项目
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { 
        id: parseInt(req.params.id),
        OR: [
          { userId: req.user.id },
          { ownerId: req.user.id }
        ]
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 先删除项目下的任务
    await prisma.task.deleteMany({
      where: { projectId: parseInt(req.params.id) }
    });
    
    await prisma.project.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
