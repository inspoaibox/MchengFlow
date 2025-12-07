import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../db/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../uploads');

// 确保上传目录存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const router = Router();

// 动态配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // 解码中文文件名
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    // 保存解码后的原始文件名到 file 对象
    file.decodedOriginalName = originalName;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: async (req, file, cb) => {
    try {
      const settings = await prisma.settings.findFirst({ where: { id: 1 } });
      const allowedTypes = (settings?.allowedFileTypes || '.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif').split(',').map(t => t.trim().toLowerCase());
      // 解码中文文件名后获取扩展名
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const ext = path.extname(originalName).toLowerCase();
      
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`不支持的文件格式: ${ext}`));
      }
    } catch (err) {
      cb(err);
    }
  }
});

// 上传附件
router.post('/task/:taskId', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }
    
    const taskId = parseInt(req.params.taskId);
    const task = await prisma.task.findFirst({ where: { id: taskId, userId: req.user.id } });
    
    if (!task) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: '任务不存在' });
    }
    
    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        userId: req.user.id,
        filename: req.file.filename,
        originalName: req.file.decodedOriginalName || req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    });
    
    res.json(attachment);
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 获取任务的附件列表
router.get('/task/:taskId', authMiddleware, async (req, res) => {
  try {
    const attachments = await prisma.attachment.findMany({
      where: { taskId: parseInt(req.params.taskId) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(attachments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 下载附件
router.get('/download/:id', authMiddleware, async (req, res) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!attachment) {
      return res.status(404).json({ error: '附件不存在' });
    }
    
    const filePath = path.join(uploadDir, attachment.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    res.download(filePath, attachment.originalName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除附件
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!attachment) {
      return res.status(404).json({ error: '附件不存在' });
    }
    
    // 删除文件
    const filePath = path.join(uploadDir, attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await prisma.attachment.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
