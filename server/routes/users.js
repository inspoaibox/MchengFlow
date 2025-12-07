import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/database.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// 获取所有用户
router.get('/', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, email, role, created_at FROM users').all();
  res.json(users);
});

// 创建新用户（管理员）
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  const { username, password, email, role } = req.body;
  
  if (!username || !password || !email) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }
  
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userRole = ['admin', 'user'].includes(role) ? role : 'user';
    
    const stmt = db.prepare('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)');
    const result = stmt.run(username, hashedPassword, email, userRole);
    
    res.json({ 
      message: '用户创建成功',
      user: { id: result.lastInsertRowid, username, email, role: userRole }
    });
  } catch (err) {
    res.status(400).json({ error: '用户名或邮箱已存在' });
  }
});

// 更新用户角色
router.put('/:id/role', authMiddleware, adminMiddleware, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: '无效的角色' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: '角色更新成功' });
});

// 更新用户信息
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { username, email, password, role } = req.body;
  const userId = parseInt(req.params.id);
  
  // 检查用户是否存在
  const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existingUser) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  try {
    // 检查用户名是否被其他用户使用
    if (username && username !== existingUser.username) {
      const usernameExists = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
      if (usernameExists) {
        return res.status(400).json({ error: '用户名已被使用' });
      }
    }
    
    // 检查邮箱是否被其他用户使用
    if (email && email !== existingUser.email) {
      const emailExists = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
      if (emailExists) {
        return res.status(400).json({ error: '邮箱已被使用' });
      }
    }
    
    // 构建更新语句
    const updates = [];
    const values = [];
    
    if (username) { updates.push('username = ?'); values.push(username); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (password && password.length >= 6) { 
      updates.push('password = ?'); 
      values.push(bcrypt.hashSync(password, 10)); 
    }
    if (role && ['admin', 'user'].includes(role)) { 
      updates.push('role = ?'); 
      values.push(role); 
    }
    
    if (updates.length > 0) {
      values.push(userId);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    
    res.json({ message: '用户更新成功' });
  } catch (err) {
    res.status(400).json({ error: '更新失败: ' + err.message });
  }
});

// 删除用户
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  if (req.params.id == req.user.id) {
    return res.status(400).json({ error: '不能删除自己' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: '用户删除成功' });
});

export default router;
