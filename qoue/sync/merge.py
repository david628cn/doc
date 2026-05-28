import os
from pathlib import Path
from datetime import datetime

# 1. 设置输出文件名
output_file  = f"{datetime.now().strftime("%Y-%m-%d")}.sql"
current_dir  = Path.cwd()

print(f"🔍 正在检索以 'temp' 开头的文件夹...")

with open(output_file, 'w', encoding='utf-8') as outfile:
    # 2. 仅匹配当前目录下以 temp 开头的文件夹
    # 使用 sorted 确保 temp1, temp2 按顺序合并
    for folder in sorted(current_dir.glob('temp*')):
        if folder.is_dir():
            print(f"📂 处理文件夹: {folder.name}")
            
            # 3. 递归获取该文件夹下所有 SQL
            sql_files = sorted(folder.rglob('*.sql'))
            
            for sql_path in sql_files:
                print(f"  📄 读取: {sql_path.name}")
                with open(sql_path, 'r', encoding='utf-8', errors='ignore') as infile:
                    # 写入标记注释
                    # outfile.write(f"\n-- FOLDER: {folder.name} | FILE: {sql_path.name}\n")
                    outfile.write(infile.read())
                    # outfile.write("\n")

print(f"\n✅ 合并完成！结果保存在: {output_file}")