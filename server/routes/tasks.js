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
    
    const today = new Date().toISOString().split('T')[0];
    const parsed = tasks.map(t => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description || '',
      column: t.columnStatus || 'todo',
      startDate: t.startDate || today,
      dueDate: t.dueDate,
      priority: t.priority || 'p2',
      assignees: JSON.parse(t.assignees || '[]'),
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
      startDate: t.startDate || new Date().toISOString().split('T')[0],
      dueDate: t.dueDate,
      priority: t.priority || 'p2',
      assignees: JSON.parse(t.assignees || '[]'),
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
    const { projectId, title, description, column, startDate, dueDate, priority, assignees, subtasks, tags, chatHistory } = req.body;
    
    const today = new Date().toISOString().split('T')[0];
    const task = await prisma.task.create({
      data: {
        projectId: projectId || null,
        userId: req.user.id,
        title,
        description: description || '',
        columnStatus: column || 'todo',
        startDate: startDate || today,
        dueDate: dueDate || null,
        priority: priority || 'p2',
        assignees: JSON.stringify(assignees || []),
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
      startDate: task.startDate,
      dueDate: task.dueDate,
      priority: task.priority || 'p2',
      assignees: assignees || [],
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
    const { projectId, title, description, column, startDate, dueDate, priority, assignees, completedAt, subtasks, tags, chatHistory } = req.body;
    
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
        startDate,
        dueDate,
        priority,
        assignees: JSON.stringify(assignees || []),
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
