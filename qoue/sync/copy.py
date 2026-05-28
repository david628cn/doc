import os

def count_files(directory):
    count = sum(1 for _ in os.scandir(directory) if _.is_file())
    return count

def batch_rename_files(directory):
    total = count_files(directory)
    # 获取目录中的所有文件
    files = os.listdir(directory)
    # 遍历文件列表
    sum = 0
    for i, file in enumerate(files):
        old_file_path = os.path.join(directory, file)
        old_file_name = os.path.basename(old_file_path)
        old_file_name_arr = old_file_name.split("-")
        # new_file_name = f"{old_file_name_arr[0]}-2025-10-27.json"
        if os.path.isdir(old_file_path) is False:
            old_file_dir = f"{old_file_name_arr[1]}-{old_file_name_arr[2]}-{old_file_name_arr[3]}".split(".")
            old_file_dir = old_file_dir[0]
            dir_path = os.path.join(directory, f"{old_file_dir}")
            if os.path.isdir(dir_path) is False:
                os.mkdir(os.path.join(directory, f"{old_file_dir}"))
            new_file_path = os.path.join(directory, f"{old_file_dir}", old_file_name)
            os.rename(old_file_path, new_file_path)
            print(f"Renamed {old_file_path} {sum} / {total}")
            sum = sum + 1
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
directory = './data/trade'  # 指定目录路径
batch_rename_files(directory)