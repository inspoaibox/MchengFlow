import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'app.db'));

console.log('Starting migration...');

try {
  // 检查 tasks 表结构
  const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
  console.log('Current tasks columns:', tableInfo.map(c => `${c.name}(notnull:${c.notnull})`));
  
  const projectIdCol = tableInfo.find(c => c.name === 'project_id');
  
  if (projectIdCol && projectIdCol.notnull === 1) {
    console.log('Need to migrate tasks table...');
    
    // 备份数据
    const existingTasks = db.prepare('SELECT * FROM tasks').all();
    console.log(`Backing up ${existingTasks.length} tasks...`);
    
    // 删除旧表
    db.exec('DROP TABLE tasks');
    console.log('Dropped old tasks table');
    
    // 创建新表（project_id 可为空）
    db.exec(`
      CREATE TABLE tasks (
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
    console.log('Created new tasks table');
    
    // 恢复数据
    const insert = db.prepare(`
      INSERT INTO tasks (id, project_id, user_id, title, description, column_status, due_date, priority, completed_at, subtasks, tags, chat_history, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const task of existingTasks) {
      insert.run(
        task.id,
        task.project_id,
        task.user_id || task.assignee_id || 1,
        task.title,
        task.description || '',
        task.column_status || task.status || 'todo',
        task.due_date || null,
        task.priority || 'p2',
        task.completed_at || null,
        task.subtasks || '[]',
        task.tags || '[]',
        task.chat_history || '[]',
        task.created_at
      );
    }
    console.log(`Restored ${existingTasks.length} tasks`);
    
    console.log('Migration completed successfully!');
  } else {
    console.log('No migration needed - project_id already allows NULL');
  }
} catch (e) {
  console.error('Migration failed:', e.message);
}

db.close();
