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
      status: p.status || 'active',
      assignees: JSON.parse(p.assignees || '[]'),
      startDate: p.startDate,
      endDate: p.endDate,
      pinned: p.pinned || 0,
      color: p.color || null,
      archived: p.archived || 0,
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
  console.log('=== CREATE PROJECT REQUEST ===');
  console.log('User:', req.user);
  console.log('Body:', req.body);
  try {
    const { title, description, status, assignees, startDate, endDate } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    const project = await prisma.project.create({
      data: {
        userId: req.user.id,
        title,
        description: description || '',
        status: status || 'active',
        assignees: JSON.stringify(assignees || []),
        startDate: startDate || today,
        endDate: endDate || null
      }
    });
    
    console.log('Created project:', project);
    res.json({ 
      id: project.id, 
      userId: project.userId, 
      title: project.title, 
      description: project.description || '',
      status: project.status,
      assignees: assignees || [],
      startDate: project.startDate,
      endDate: project.endDate
    });
  } catch (err) {
    console.error('Create project error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// 更新项目
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, status, assignees, startDate, endDate, pinned, color, archived } = req.body;
    
    console.log('Update project request:', { id: req.params.id, status, title, pinned, color, archived });
    
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
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (assignees !== undefined) updateData.assignees = JSON.stringify(assignees);
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (pinned !== undefined) updateData.pinned = pinned;
    if (color !== undefined) updateData.color = color;
    if (archived !== undefined) updateData.archived = archived;
    
    console.log('Update data:', updateData);
    
    const updated = await prisma.project.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    
    console.log('Updated project:', updated);
    
    res.json({ 
      message: '更新成功',
      project: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        status: updated.status,
        assignees: JSON.parse(updated.assignees || '[]'),
        startDate: updated.startDate,
        endDate: updated.endDate,
        pinned: updated.pinned || 0,
        color: updated.color || null,
        archived: updated.archived || 0,
        createdAt: updated.createdAt
      }
    });
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
