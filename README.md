# editor

# 只要结构，不要数据（单个库）
pg_dump -h HOST -U USER -d DBNAME --schema-only --no-owner --no-privileges -f schema.sql