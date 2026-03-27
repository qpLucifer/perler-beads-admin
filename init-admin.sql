-- 拼豆 DIY 后台管理系统 - 管理员账号初始化脚本
-- 执行此 SQL 创建管理员账号

-- 管理员账号
-- 用户名：admin
-- 密码：admin123

INSERT INTO users (username, email, password_hash, nickname, role, status, created_at) 
VALUES (
  'admin',
  'admin@perlerbeads.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  '管理员',
  'admin',
  1,
  NOW()
) ON DUPLICATE KEY UPDATE role = 'admin';

-- 验证创建
SELECT id, username, email, nickname, role, status, created_at 
FROM users 
WHERE username = 'admin';
