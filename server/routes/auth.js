import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/database.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

// 检查是否有用户（用于注册页面显示）
router.get('/has-users', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  res.json({ hasUsers: userCount.count > 0 });
});

router.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ error: '请填写所有字段' });
  }

  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const role = userCount.count === 0 ? 'admin' : 'user';
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const stmt = db.prepare('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)');
    const result = stmt.run(username, hashedPassword, email, role);
    
    const user = { id: result.lastInsertRowid, username, email, role };
    const token = generateToken(user);
    res.json({ user, token, message: role === 'admin' ? '注册成功，您是首位用户，已设为管理员' : '注册成功' });
  } catch (err) {
    res.status(400).json({ error: '用户名或邮箱已存在' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  const token = generateToken(user);
  res.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role }, token });
});

export default router;
