import { Router } from 'express';
import db from '../db/database.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// 获取所有渠道
router.get('/', authMiddleware, adminMiddleware, (req, res) => {
  const channels = db.prepare('SELECT * FROM ai_channels ORDER BY created_at DESC').all();
  res.json(channels.map(c => ({
    ...c,
    models: JSON.parse(c.models || '[]'),
    api_key: c.api_key ? '********' : ''
  })));
});

// 添加渠道
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  const { name, type, base_url, api_key } = req.body;
  if (!name || !type || !api_key) {
    return res.status(400).json({ error: '请填写必要字段' });
  }
  
  const result = db.prepare(
    'INSERT INTO ai_channels (name, type, base_url, api_key) VALUES (?, ?, ?, ?)'
  ).run(name, type, base_url || '', api_key);
  
  res.json({ id: result.lastInsertRowid, message: '渠道添加成功' });
});

// 更新渠道
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { name, type, base_url, api_key, models, enabled } = req.body;
  const channel = db.prepare('SELECT * FROM ai_channels WHERE id = ?').get(req.params.id);
  if (!channel) return res.status(404).json({ error: '渠道不存在' });

  // 如果 api_key 是占位符，保留原来的
  const finalApiKey = api_key === '********' ? channel.api_key : api_key;
  
  db.prepare(`
    UPDATE ai_channels SET 
      name = ?, type = ?, base_url = ?, api_key = ?, 
      models = ?, enabled = ?
    WHERE id = ?
  `).run(
    name || channel.name,
    type || channel.type,
    base_url ?? channel.base_url,
    finalApiKey,
    JSON.stringify(models || JSON.parse(channel.models)),
    enabled !== undefined ? (enabled ? 1 : 0) : channel.enabled,
    req.params.id
  );
  
  res.json({ message: '渠道更新成功' });
});

// 删除渠道
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM ai_channels WHERE id = ?').run(req.params.id);
  res.json({ message: '渠道删除成功' });
});

// 获取渠道的模型列表
router.post('/:id/fetch-models', authMiddleware, adminMiddleware, async (req, res) => {
  const channel = db.prepare('SELECT * FROM ai_channels WHERE id = ?').get(req.params.id);
  if (!channel) return res.status(404).json({ error: '渠道不存在' });

  try {
    let models = [];
    
    if (channel.type === 'gemini') {
      // Gemini API 获取模型
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${channel.api_key}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      models = data.models?.map(m => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name
      })) || [];
    } else if (channel.type === 'openai' || channel.type === 'openai-compatible') {
      // OpenAI 或兼容 API 获取模型
      const baseUrl = channel.base_url || 'https://api.openai.com/v1';
      const response = await fetch(`${baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${channel.api_key}` }
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      models = data.data?.map(m => ({
        id: m.id,
        name: m.id
      })) || [];
    }

    // 保存获取到的模型
    db.prepare('UPDATE ai_channels SET models = ? WHERE id = ?')
      .run(JSON.stringify(models), req.params.id);

    res.json({ models, message: `成功获取 ${models.length} 个模型` });
  } catch (error) {
    res.status(500).json({ error: `获取模型失败: ${error.message}` });
  }
});

// 获取所有可用模型（用于前端选择默认模型）
router.get('/all-models', authMiddleware, (req, res) => {
  const channels = db.prepare('SELECT * FROM ai_channels WHERE enabled = 1').all();
  const allModels = [];
  
  channels.forEach(channel => {
    const models = JSON.parse(channel.models || '[]');
    models.forEach(model => {
      allModels.push({
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        modelId: model.id,
        modelName: model.name,
        fullId: `${channel.id}:${model.id}` // 唯一标识
      });
    });
  });
  
  res.json(allModels);
});

// 获取当前默认模型配置（供前端 AI 调用使用）
router.get('/default', authMiddleware, (req, res) => {
  const settings = db.prepare('SELECT default_model FROM settings WHERE id = 1').get();
  if (!settings?.default_model) {
    return res.json({ configured: false });
  }
  
  const [channelId, modelId] = settings.default_model.split(':');
  const channel = db.prepare('SELECT * FROM ai_channels WHERE id = ? AND enabled = 1').get(channelId);
  
  if (!channel) {
    return res.json({ configured: false });
  }
  
  res.json({
    configured: true,
    type: channel.type,
    baseUrl: channel.base_url,
    apiKey: channel.api_key,
    model: modelId
  });
});

export default router;
