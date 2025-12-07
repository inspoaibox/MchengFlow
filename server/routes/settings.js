import { Router } from 'express';
import prisma from '../db/prisma.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// 公开接口：获取站点名称
router.get('/public', async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst({ where: { id: 1 } });
    res.json({ siteName: settings?.siteName || 'GeminiFlow' });
  } catch (err) {
    res.json({ siteName: 'GeminiFlow' });
  }
});

// 获取所有设置（管理员）
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    let settings = await prisma.settings.findFirst({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.settings.create({ data: { id: 1 } });
    }
    res.json({
      siteName: settings.siteName,
      allowRegistration: !!settings.allowRegistration,
      defaultRole: settings.defaultRole,
      defaultModel: settings.defaultModel || '',
      allowedFileTypes: settings.allowedFileTypes || '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip',
      maxFileSize: settings.maxFileSize || 10
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新设置（管理员）
router.put('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { siteName, allowRegistration, defaultRole, defaultModel, allowedFileTypes, maxFileSize } = req.body;
    
    await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        siteName,
        allowRegistration: allowRegistration ? 1 : 0,
        defaultRole,
        defaultModel: defaultModel || '',
        allowedFileTypes: allowedFileTypes || '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip',
        maxFileSize: maxFileSize || 10
      },
      create: {
        id: 1,
        siteName,
        allowRegistration: allowRegistration ? 1 : 0,
        defaultRole,
        defaultModel: defaultModel || '',
        allowedFileTypes: allowedFileTypes || '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip',
        maxFileSize: maxFileSize || 10
      }
    });
    
    res.json({ message: '设置已更新' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
