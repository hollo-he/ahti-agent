-- 添加 updated_at 字段到 user_sessions 表
ALTER TABLE user_sessions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 更新现有记录的 updated_at 字段
UPDATE user_sessions SET updated_at = created_at WHERE updated_at IS NULL;