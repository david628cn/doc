import os

def batch_rename_files(directory):
    # 获取目录中的所有文件
    files = os.listdir(directory)
    # 遍历文件列表
    for i, file in enumerate(files):
        old_file_path = os.path.join(directory, file)
        old_file_name = os.path.basename(old_file_path)
        old_file_name_arr = old_file_name.split("-")
        new_file_name = f"{old_file_name_arr[0]}-2025-10-27.json"
        new_file_path = os.path.join(directory, new_file_name)
        os.rename(old_file_path, new_file_path)
        print(f"Renamed {new_file_name} ")
        # # 构建原文件路径
        # old_file_path = os.path.join(directory, file)
        # # 构建新文件名，例如在原文件名前添加前缀
        # new_file_name = f"{prefix}{file}"
        # # 构建新文件路径
        # new_file_path = os.path.join(directory, new_file_name)
        # # 重命名文件
        # os.rename(old_file_path, new_file_path)
        # print(f"Renamed '{old_file_path}' to '{new_file_path}'")

# 使用示例
directory = './temp'  # 指定目录路径
batch_rename_files(directory)