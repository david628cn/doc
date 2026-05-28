import json
import os
import sys
from datetime import datetime


def loadJson(file_path: list):
    result = None
    ave_path = os.path.join(*file_path)
    with open(ave_path, "r", encoding='utf-8') as file:
        json_data = file.read()
        result = json.loads(json_data)
    return result


def doInferByDays(days: int = 0, grap: int = 0):
    stocks = loadJson([os.getcwd(), 'data', 'stocks.json'])
    result = []
    for code in stocks:
        min = sys.float_info.max
        min_date = None
        max = sys.float_info.min
        max_date = None
        stock_list = stocks[code]["list"][-days:]
        current_date = datetime.strptime(stock_list[-1]["date"], "%Y-%m-%d")
        for stock in stock_list:
            if min >= stock["low"]:
                min = stock["low"]
                min_date = stock["date"]
            if max <= stock["high"]:
                max = stock["high"]
                max_date = stock["date"]
        delta  = current_date - datetime.strptime(min_date, "%Y-%m-%d")
        delta_days = abs(delta.days)
        if grap == 0:
            result.append({
                **stock,
                # "code": code,
                # "name": stocks[code]["name"],
                "min": min,
                "min_date": min_date,
                "max": max,
                "max_date": max_date
            })
        elif delta_days <= grap:
            result.append({
                **stock,
                # "code": code,
                # "name": stocks[code]["name"],
                "min": min,
                "min_date": min_date,
                "max": max,
                "max_date": max_date,
                "delta_days": delta_days
            })
    return result

doInferByDays(30, 10)
