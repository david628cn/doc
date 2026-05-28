import os
import json

def loadJson(file_path: list):
    result = None
    ave_path = os.path.join(*file_path)
    with open(ave_path, "r", encoding='utf-8') as file:
        json_data = file.read()
        result = json.loads(json_data)
    return result