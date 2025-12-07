import { Router } from 'express';
import prisma from '../db/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 获取用户的所有任务
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    const parsed = tasks.map(t => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description || '',
      column: t.columnStatus || 'todo',
      dueDate: t.dueDate,
      priority: t.priority || 'p2',
      completedAt: t.completedAt,
      subtasks: JSON.parse(t.subtasks || '[]'),
      tags: JSON.parse(t.tags || '[]'),
      chatHistory: JSON.parse(t.chatHistory || '[]'),
      createdAt: t.createdAt
    }));
    res.json(parsed);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 获取项目的任务
router.get('/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { 
        projectId: parseInt(req.params.projectId),
        userId: req.user.id 
      }
    });
    
    const parsed = tasks.map(t => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description || '',
      column: t.columnStatus || 'todo',
      dueDate: t.dueDate,
      priority: t.priority || 'p2',
      completedAt: t.completedAt,
      subtasks: JSON.parse(t.subtasks || '[]'),
      tags: JSON.parse(t.tags || '[]'),
      chatHistory: JSON.parse(t.chatHistory || '[]')
    }));
    res.json(parsed);
  } catch (err) {
    console.error('Get project tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 创建任务
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { projectId, title, description, column, dueDate, priority, subtasks, tags, chatHistory } = req.body;
    
    const task = await prisma.task.create({
      data: {
        projectId: projectId || null,
        userId: req.user.id,
        title,
        description: description || '',
        columnStatus: column || 'todo',
        dueDate: dueDate || null,
        priority: priority || 'p2',
        subtasks: JSON.stringify(subtasks || []),
        tags: JSON.stringify(tags || []),
        chatHistory: JSON.stringify(chatHistory || [])
      }
    });
    
    res.json({
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description || '',
      column: task.columnStatus || 'todo',
      dueDate: task.dueDate,
      priority: task.priority || 'p2',
      completedAt: null,
      subtasks: subtasks || [],
      tags: tags || [],
      chatHistory: chatHistory || []
    });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 更新任务
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { projectId, title, description, column, dueDate, priority, completedAt, subtasks, tags, chatHistory } = req.body;
    
    const task = await prisma.task.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id }
    });
    
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: {
        projectId: projectId,
        title,
        description,
        columnStatus: column,
        dueDate,
        priority,
        completedAt,
        subtasks: JSON.stringify(subtasks || []),
        tags: JSON.stringify(tags || []),
        chatHistory: JSON.stringify(chatHistory || [])
      }
    });
    
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 删除任务
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id }
    });
    
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    await prisma.task.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
