
# from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional, List
import math
from datetime import datetime
import os
from fastapi import APIRouter
from payload.responseModel import ResponseModel
import json

router = APIRouter()

def toFloat(a):
    if a == '-':
        return 0
    b = a * 0.01
    s = f"{b: 2f}"
    return float(s)

def toNum(a):
    if a == '-':
        return 0
    return a

class SyncModel(BaseModel):
    rw: bool = False
    code: str
    date: Optional[str] = datetime.now().strftime("%Y-%m-%d")
    stock: dict
    fund: dict
    details: List[str]
    msg: Optional[str] = ""
    dir: Optional[str] = "temp"

@router.post("/sync")
async def doSync(syncModel: SyncModel):
    lineList = syncModel.stock
    fund = syncModel.fund
    details = syncModel.details
    code = syncModel.code
    date = syncModel.date
    dir = syncModel.dir
    logMsg = syncModel.msg
    if logMsg != "":
        print(f"开始 {logMsg}")
    result = {}
    mainDirectory = os.path.join(os.getcwd(), "sync", dir)
    if os.path.isdir(mainDirectory) is False:    
        os.mkdir(mainDirectory)
    # sqlFile = os.path.join(os.getcwd(), "sync", dir, f"{date}.sql")
    # if not os.path.exists(sqlFile): 
    #     with open(sqlFile, 'w') as f:
    #         pass
    with open(os.path.join(mainDirectory, f"{date}.sql"), 'a', encoding='utf-8') as file:
        if syncModel.rw:
            file.truncate(0)
        _code = lineList['f12']
        _name = lineList['f14']
        _type = int(lineList['f13'])
        # _date = datetime.strptime("2025-04-28", "%Y-%m-%d") # datetime.now().strftime("%Y-%m-%d")
        _date = date
        # _date = "2025-10-16"
        _current = toFloat(lineList['f2'])
        _price = toFloat(lineList['f3'])
        _amount = toFloat(lineList['f4'])
        _turnover = toFloat(lineList['f8'])
        _quantity = math.ceil(toNum(lineList['f5']))
        _volume = toNum(lineList['f6'])
        _amplitude = toFloat(lineList['f7'])
        _high = toFloat(lineList['f15'])
        _low = toFloat(lineList['f16'])
        _open = toFloat(lineList['f17'])
        _prev = toFloat(lineList['f18'])
        _trends = ""
        
        result[_code] = {
            "code": _code,
            "name": _name,
            "type": _type,
            "date": _date,
            "current": _current,
            "open": _open,
            "low": _low,
            "high": _high,
            "prev": _prev,
            "price": _price,
            "amount": _amount,
            "quantity": _quantity,
            "volume": _volume,
            "amplitude": _amplitude,
            "turnover": _turnover,
            "main_in": 0,
            "main_out": 0,
            "main_delta": 0,
            "large_in": 0,
            "large_out": 0,
            "large_delta": 0,
            "big_in": 0,
            "big_out": 0,
            "big_delta": 0,
            "mid_in": 0,
            "mid_out": 0,
            "mid_delta": 0,
            "min_in": 0,
            "min_out": 0,
            "min_delta": 0
        }
        _fund = {
            "main_in": toNum(fund['f135']),
            "main_out": toNum(fund['f136']),
            "main_delta": toNum(fund['f137']),
            "large_in": toNum(fund['f138']),
            "large_out": toNum(fund['f139']),
            "large_delta": toNum(fund['f140']),
            "big_in": toNum(fund['f141']),
            "big_out": toNum(fund['f142']),
            "big_delta": toNum(fund['f143']),
            "mid_in": toNum(fund['f144']),
            "mid_out": toNum(fund['f145']),
            "mid_delta": toNum(fund['f146']),
            "min_in": toNum(fund['f147']),
            "min_out": toNum(fund['f148']),
            "min_delta": toNum(fund['f149'])
        }
        result[_code]["main_in"] = _fund['main_in']
        result[_code]["main_out"] = _fund['main_out']
        result[_code]["main_delta"] = _fund['main_delta']

        result[_code]["large_in"] = _fund['large_in']
        result[_code]["large_out"] = _fund['large_out']
        result[_code]["large_delta"] = _fund['large_delta']

        result[_code]["big_in"] = _fund['big_in']
        result[_code]["big_out"] = _fund['big_out']
        result[_code]["big_delta"] = _fund['big_delta']

        result[_code]["mid_in"] = _fund['mid_in']
        result[_code]["mid_out"] = _fund['mid_out']
        result[_code]["mid_delta"] = _fund['mid_delta']

        result[_code]["min_in"] = _fund['min_in']
        result[_code]["min_out"] = _fund['min_out']
        result[_code]["min_delta"] = _fund['min_delta']
        file.write(f"INSERT INTO sys_stock(code,name,type,date,current,price,amount,turnover,quantity,volume,amplitude,high,low,open,prev,main_in,main_out,main_delta,large_in,large_out,large_delta,big_in,big_out,big_delta,mid_in,mid_out,mid_delta,min_in,min_out,min_delta) VALUES('{_code}','{_name}',{_type},'{_date}',{_current},{_price},{_amount},{_turnover},{_quantity},{_volume},{_amplitude},{_high},{_low},{_open},{_prev},{result[_code]["main_in"]},{result[_code]["main_out"]},{result[_code]["main_delta"]},{result[_code]["large_in"]},{result[_code]["large_out"]},{result[_code]["large_delta"]},{result[_code]["big_in"]},{result[_code]["big_out"]},{result[_code]["big_delta"]},{result[_code]["mid_in"]},{result[_code]["mid_out"]},{result[_code]["mid_delta"]},{result[_code]["min_in"]},{result[_code]["min_out"]},{result[_code]["min_delta"]});\n")
        file.close()

    # tradeDirectory = os.path.join(mainDirectory, f"{date}")
    tradeDir = os.path.join(os.getcwd(), "sync", "data", "trade")
    tradeDirectory = os.path.join(tradeDir, f"{date}")
    if os.path.isdir(tradeDirectory) is False:    
        os.mkdir(tradeDirectory)
    with open(os.path.join(tradeDirectory, f"{code}-{date}.json"), 'w', encoding='utf-8') as f:
        f.truncate(0)
        # f.write(json.dumps(details, indent = 4, ensure_ascii = False))
        f.write(json.dumps(details, ensure_ascii = False))
        f.close()
    if logMsg != "":
        print(f"完成 {logMsg}")

    return ResponseModel(code = 200, message = "同步成功")



def toFloatEx(a):
    if a == '-':
        return 0
    b = a
    s = f"{b: 2f}"
    return float(s)

@router.post("/syncByDay")
async def doSyncByDay(syncModel: SyncModel):
    lineList = syncModel.stock
    fund = syncModel.fund
    details = syncModel.details
    code = syncModel.code
    date = syncModel.date
    dir = syncModel.dir
    logMsg = syncModel.msg
    if logMsg != "":
        print(f"开始 {logMsg}")
    result = {}
    mainDirectory = os.path.join(os.getcwd(), "sync", dir)
    if os.path.isdir(mainDirectory) is False:    
        os.mkdir(mainDirectory)
    # sqlFile = os.path.join(os.getcwd(), "sync", dir, f"{date}.sql")
    # if not os.path.exists(sqlFile): 
    #     with open(sqlFile, 'w') as f:
    #         pass
    with open(os.path.join(mainDirectory, f"{date}.sql"), 'a', encoding='utf-8') as file:
        if syncModel.rw:
            file.truncate(0)
        _code = lineList['f12']
        _name = lineList['f14']
        _type = int(lineList['f13'])
        # _date = datetime.strptime("2025-04-28", "%Y-%m-%d") # datetime.now().strftime("%Y-%m-%d")
        _date = date
        # _date = "2025-10-16"
        _current = float(lineList['f2'])
        _price = float(lineList['f3'])
        _amount = float(lineList['f4'])
        _turnover = float(lineList['f8'])
        _quantity = float(lineList['f5'])
        _volume = float(lineList['f6'])
        _amplitude = float(lineList['f7'])
        _high = float(lineList['f15'])
        _low = float(lineList['f16'])
        _open = float(lineList['f17'])
        # _prev = float(lineList['f18'])
        _prev = toFloatEx(float(lineList['f2']) - float(lineList['f4']))
        _trends = ""
        
        result[_code] = {
            "code": _code,
            "name": _name,
            "type": _type,
            "date": _date,
            "current": _current,
            "open": _open,
            "low": _low,
            "high": _high,
            "prev": _prev,
            "price": _price,
            "amount": _amount,
            "quantity": _quantity,
            "volume": _volume,
            "amplitude": _amplitude,
            "turnover": _turnover,
            "main_in": 0,
            "main_out": 0,
            "main_delta": 0,
            "large_in": 0,
            "large_out": 0,
            "large_delta": 0,
            "big_in": 0,
            "big_out": 0,
            "big_delta": 0,
            "mid_in": 0,
            "mid_out": 0,
            "mid_delta": 0,
            "min_in": 0,
            "min_out": 0,
            "min_delta": 0
        }
        # _fund = {
        #     "main_in": toNum(fund['f135']),
        #     "main_out": toNum(fund['f136']),
        #     "main_delta": toNum(fund['f137']),
        #     "large_in": toNum(fund['f138']),
        #     "large_out": toNum(fund['f139']),
        #     "large_delta": toNum(fund['f140']),
        #     "big_in": toNum(fund['f141']),
        #     "big_out": toNum(fund['f142']),
        #     "big_delta": toNum(fund['f143']),
        #     "mid_in": toNum(fund['f144']),
        #     "mid_out": toNum(fund['f145']),
        #     "mid_delta": toNum(fund['f146']),
        #     "min_in": toNum(fund['f147']),
        #     "min_out": toNum(fund['f148']),
        #     "min_delta": toNum(fund['f149'])
        # }
        # result[_code]["main_in"] = _fund['main_in']
        # result[_code]["main_out"] = _fund['main_out']
        # result[_code]["main_delta"] = _fund['main_delta']

        # result[_code]["large_in"] = _fund['large_in']
        # result[_code]["large_out"] = _fund['large_out']
        # result[_code]["large_delta"] = _fund['large_delta']

        # result[_code]["big_in"] = _fund['big_in']
        # result[_code]["big_out"] = _fund['big_out']
        # result[_code]["big_delta"] = _fund['big_delta']

        # result[_code]["mid_in"] = _fund['mid_in']
        # result[_code]["mid_out"] = _fund['mid_out']
        # result[_code]["mid_delta"] = _fund['mid_delta']

        # result[_code]["min_in"] = _fund['min_in']
        # result[_code]["min_out"] = _fund['min_out']
        # result[_code]["min_delta"] = _fund['min_delta']
        file.write(f"INSERT INTO sys_stock(code,name,type,date,current,price,amount,turnover,quantity,volume,amplitude,high,low,open,prev,main_in,main_out,main_delta,large_in,large_out,large_delta,big_in,big_out,big_delta,mid_in,mid_out,mid_delta,min_in,min_out,min_delta) VALUES('{_code}','{_name}',{_type},'{_date}',{_current},{_price},{_amount},{_turnover},{_quantity},{_volume},{_amplitude},{_high},{_low},{_open},{_prev},{result[_code]["main_in"]},{result[_code]["main_out"]},{result[_code]["main_delta"]},{result[_code]["large_in"]},{result[_code]["large_out"]},{result[_code]["large_delta"]},{result[_code]["big_in"]},{result[_code]["big_out"]},{result[_code]["big_delta"]},{result[_code]["mid_in"]},{result[_code]["mid_out"]},{result[_code]["mid_delta"]},{result[_code]["min_in"]},{result[_code]["min_out"]},{result[_code]["min_delta"]});\n")
        
        # file.write(f"UPDATE sys_stock SET current={_current},price={_price},amount={_amount},turnover={_turnover},quantity={_quantity},volume={_volume},amplitude={_amplitude},high={_high},low={_low},open={_open},prev={_prev} WHERE code='{_code}' AND date='{_date}';\n")
        file.close()

    # tradeDirectory = os.path.join(mainDirectory, f"{date}")

    # tradeDir = os.path.join(os.getcwd(), "sync", "data", "trade")
    # tradeDirectory = os.path.join(tradeDir, f"{date}")
    # if os.path.isdir(tradeDirectory) is False:    
    #     os.mkdir(tradeDirectory)
    # with open(os.path.join(tradeDirectory, f"{code}-{date}.json"), 'w', encoding='utf-8') as f:
    #     f.truncate(0)
    #     # f.write(json.dumps(details, indent = 4, ensure_ascii = False))
    #     f.write(json.dumps(details, ensure_ascii = False))
    #     f.close()
    if logMsg != "":
        print(f"完成 {logMsg}")

    return ResponseModel(code = 200, message = "同步成功")
