import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'app.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    site_name TEXT DEFAULT 'GeminiFlow',
    allow_registration INTEGER DEFAULT 1,
    default_role TEXT DEFAULT 'user',
    default_model TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ai_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    base_url TEXT,
    api_key TEXT NOT NULL,
    models TEXT DEFAULT '[]',
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    owner_id INTEGER,
    name TEXT,
    title TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 添加缺失的列（如果不存在）
try { db.exec(`ALTER TABLE projects ADD COLUMN user_id INTEGER`); } catch (e) {}
try { db.exec(`ALTER TABLE projects ADD COLUMN title TEXT`); } catch (e) {}

// tasks 表迁移 - 重建表以移除 NOT NULL 约束
try {
  const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
  const projectIdCol = tableInfo.find(c => c.name === 'project_id');
  
  if (projectIdCol && projectIdCol.notnull === 1) {
    console.log('Migrating tasks table to allow null project_id...');
    
    // 获取现有列名
    const existingCols = tableInfo.map(c => c.name);
    console.log('Existing columns:', existingCols);
    
    // 创建新表
    db.exec(`
      CREATE TABLE tasks_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        user_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        column_status TEXT DEFAULT 'todo',
        due_date TEXT,
        priority TEXT DEFAULT 'p2',
        completed_at TEXT,
        subtasks TEXT DEFAULT '[]',
        tags TEXT DEFAULT '[]',
        chat_history TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 构建动态 INSERT 语句
    const hasUserId = existingCols.includes('user_id');
    const hasAssigneeId = existingCols.includes('assignee_id');
    const hasColumnStatus = existingCols.includes('column_status');
    const hasStatus = existingCols.includes('status');
    
    const userIdExpr = hasUserId ? 'user_id' : (hasAssigneeId ? 'assignee_id' : '1');
    const columnExpr = hasColumnStatus ? 'column_status' : (hasStatus ? 'status' : "'todo'");
    
    db.exec(`
      INSERT INTO tasks_new (id, project_id, user_id, title, description, column_status, created_at)
      SELECT id, project_id, ${userIdExpr}, title, COALESCE(description, ''), ${columnExpr}, created_at
      FROM tasks
    `);
    
    db.exec(`DROP TABLE tasks`);
    db.exec(`ALTER TABLE tasks_new RENAME TO tasks`);
    
    console.log('Tasks table migration completed.');
  }
} catch (e) {
  console.log('Tasks migration error:', e.message);
}

// 确保 tasks 表存在（新安装时）
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    user_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    column_status TEXT DEFAULT 'todo',
    due_date TEXT,
    priority TEXT DEFAULT 'p2',
    completed_at TEXT,
    subtasks TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    chat_history TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO settings (id) VALUES (1);
`);

export default db;
