import requests
import os
import json
import math
import re
import time
from datetime import datetime
from stockData import MAIN_STOCKS_OBJ
# from stockAll import MAIN_STOCKS_ALL_OBJ


cookies_str = 'qgqp_b_id=90672b8a757593658f7f51013d87539f; st_nvi=oiUBtiJhY6yrkfw2NjDSe98c9; nid=06c1236e9e1b1460187fcb22446deb5f; nid_create_time=1758614485038; gvi=zEYmGUb7o5NU5DonqyRPya975; gvi_create_time=1758614485038; st_si=85913851905698; fullscreengg=1; fullscreengg2=1; st_asi=delete; st_pvi=12807136001264; st_sp=2025-05-25%2001%3A02%3A54; st_inirUrl=https%3A%2F%2Fquote.eastmoney.com%2Fconcept%2Fsh601288.html; st_sn=14; st_psi=20251017043509547-113200354966-4455534280'
cookies_dict = {}
for cookie in cookies_str.split('; '):
    key, value = cookie.split('=', 1)
    cookies_dict[key] = value

# def doSyncByKline():
#     result = {}
#     save_path = os.path.join(os.getcwd(), 'data', 'stock.py')
#     with open(save_path, 'w', encoding='utf-8') as file:
#         for key, value in MAIN_STOCKS_OBJ.items():
#             # print(key, value)
#             result[value["code"]] = []
#             url = f'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={value["type"]}.{value["code"]}&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61&klt=101&fqt=1&end=20250427&lmt=317&cb=quote_jp1'
#             response = requests.get(url)
#             if response.status_code == 200:
#                 # jsonData = json.loads(response.text.replace("quote_jp1(", "").replace(");", ""))
#                 text = re.sub(r"^.+\(", "", response.text)
#                 text = re.sub(r"\);$", "", text)
#                 jsonData = json.loads(text)
#                 klines = jsonData['data']['klines']
#                 name = jsonData['data']['name']
#                 print(name, value["code"])
#                 for line in klines:
#                     item = {}
#                     lineList = line.split(',')
#                     # print(lineList)
#                     # file.write(f"INSERT INTO sys_stock(code,name,type,date,current,price,amount,turnover,quantity,volume,amplitude,high,low,open,prev) VALUES('{value["code"]}','{name}',{int(value["type"])},'{lineList[0]}',{float(lineList[2])},{float(lineList[8])},{float(lineList[9])},{float(lineList[10])},{float(lineList[5])},{float(lineList[6])},{float(lineList[7])},{float(lineList[3])},{float(lineList[4])},{float(lineList[1])},{float(lineList[2])-float(lineList[9])});\n")
#                     item["code"] = value["code"]
#                     item["name"] = name
#                     item["type"] = value["type"]
#                     item["date"] = lineList[0]
#                     item["current"] = float(lineList[2])
#                     item["price"] = float(lineList[8])
#                     item["amount"] = float(lineList[9])
#                     item["turnover"] = float(lineList[10])
#                     item["quantity"] = float(lineList[5])
#                     item["volume"] = float(lineList[6])
#                     item["amplitude"] = float(lineList[7])
#                     item["high"] = float(lineList[3])
#                     item["low"] = float(lineList[4])
#                     item["open"] = float(lineList[1])
#                     item["prev"] = float(lineList[2])-float(lineList[9])
#                     result[value["code"]].append(item)
#         file.truncate(0)
#         file.write(json.dumps(result, indent = 4))

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

def loadJson(file_path: list):
    result = None
    ave_path = os.path.join(*file_path)
    with open(ave_path, "r", encoding='utf-8') as file:
        json_data = file.read()
        result = json.loads(json_data)
    return result

def doSyncFund(code: str, name: str, type: str, pageNum: str):
    print("sync fund start...", f"{code} {name}")
    url = f'https://push2.eastmoney.com/api/qt/stock/get?invt=2&fltt=1&cb=jQuery351013051361154176822_1747144760150&fields=f135%2Cf136%2Cf137%2Cf138%2Cf139%2Cf140%2Cf141%2Cf142%2Cf143%2Cf144%2Cf145%2Cf146%2Cf147%2Cf148%2Cf149&secid={type}.{code}&ut=fa5fd1943c7b386f172d6893dbfba10b&wbp2u=%7C0%7C0%7C0%7Cweb&dect=1&_=1747144760151'
    try:
        resp = requests.get(url, cookies=cookies_dict)
        if resp.status_code == 200:
            resp_text = re.sub(r"^.+\(", "", resp.text)
            resp_text = re.sub(r"\);$", "", resp_text)
            resp_json = json.loads(resp_text)
            details = resp_json["data"]
            print("sync fund end...", f"{code} {name}")
            return {
                "main_in": toNum(details['f135']),
                "main_out": toNum(details['f136']),
                "main_delta": toNum(details['f137']),
                "large_in": toNum(details['f138']),
                "large_out": toNum(details['f139']),
                "large_delta": toNum(details['f140']),
                "big_in": toNum(details['f141']),
                "big_out": toNum(details['f142']),
                "big_delta": toNum(details['f143']),
                "mid_in": toNum(details['f144']),
                "mid_out": toNum(details['f145']),
                "mid_delta": toNum(details['f146']),
                "min_in": toNum(details['f147']),
                "min_out": toNum(details['f148']),
                "min_delta": toNum(details['f149'])
            }
        print(f"获取 主力资金 返回不成功: {url} {pageNum}页")
        return False
    except requests.exceptions.ConnectionError as err:
        print(f"获取 主力资金 HTTP错误发生: {url} {pageNum}页")
        return False

def doSyncDetails(code: str, name: str, type: str, date: str, pageNum: str):
    print("sync details start...", f"{code} {name}")
    url = f'https://push2.eastmoney.com/api/qt/stock/details/get?fields1=f1,f2,f3,f4&fields2=f51,f52,f53,f54,f55&fltt=2&cb=jQuery351013051361154176822_1747144760144&pos=0&secid={type}.{code}&ut=fa5fd1943c7b386f172d6893dbfba10b&wbp2u=%7C0%7C0%7C0%7Cweb&_=1747144760145'
    try:
        resp = requests.get(url, cookies=cookies_dict)
        if resp.status_code == 200:
            resp_text = re.sub(r"^.+\(", "", resp.text)
            resp_text = re.sub(r"\);$", "", resp_text)
            resp_json = json.loads(resp_text)
            details = resp_json["data"]["details"]
            with open(os.path.join(os.getcwd(), 'data', 'trade', f"{code}-{date}.json"), 'w', encoding='utf-8') as f:
                f.truncate(0)
                # f.write(json.dumps(details, indent = 4, ensure_ascii = False))
                f.write(json.dumps(details, ensure_ascii = False))
                f.close()
            print("sync details end...", f"{code} {name}")
            return True
        print(f"获取 交易数据 返回不成功: {url} {pageNum}页")
        return False
    except requests.exceptions.ConnectionError as err:
        # print(f"获取 交易数据 HTTP错误发生: {err} {code} {name}")
        print(f"获取 交易数据 HTTP错误发生: {url} {pageNum}页")
        return False

def doSyncByLastDay(page = 1, currentDate: str = datetime.now().strftime("%Y-%m-%d"), endPage = None):
    # currentDate = datetime.now().strftime("%Y-%m-%d")
    result = {}
    with open(os.path.join(os.getcwd(), 'data', 'last_stock.sql'), 'w', encoding='utf-8') as file:
        # file.truncate(0)
        pageNum = page
        pageSize = 20
        totalPage = None
        sum = 0
        trade_file = {}
        print("start")
        while (True):
            time.sleep(2)
            print("sync start...", f"{pageNum}页")
            url = f'https://push2.eastmoney.com/api/qt/clist/get?np=1&fltt=1&invt=2&cb=jQuery37108866059046083457_1747317061349&fs=m%3A0%2Bt%3A6%2Cm%3A0%2Bt%3A80%2Cm%3A1%2Bt%3A2%2Cm%3A1%2Bt%3A23%2Cm%3A0%2Bt%3A81%2Bs%3A2048&fields=f12%2Cf13%2Cf14%2Cf1%2Cf2%2Cf4%2Cf3%2Cf152%2Cf5%2Cf6%2Cf7%2Cf15%2Cf18%2Cf16%2Cf17%2Cf10%2Cf8%2Cf9%2Cf23&fid=f3&pn={pageNum}&pz={pageSize}&po=1&dect=1&ut=fa5fd1943c7b386f172d6893dbfba10b&wbp2u=%7C0%7C0%7C0%7Cweb&_=1747317061355'
            try:
                response = requests.get(url, cookies=cookies_dict)
                if response.status_code == 200:
                    # text = response.text.replace(r"/^.+\(/", "").replace(r"/\);$/", "")
                    text = re.sub(r"^.+\(", "", response.text)
                    text = re.sub(r"\);$", "", text)
                    jsonData = json.loads(text)
                    klist = jsonData["data"]["diff"]
                    total = jsonData["data"]["total"]
                    if totalPage is None:
                        if endPage is None:
                            totalPage = math.ceil(total / pageSize)
                        else:
                            totalPage = endPage
                    for lineList in klist:
                        # print(">>>>>>", MAIN_STOCKS_OBJ.get(lineList["f12"]), MAIN_STOCKS_OBJ.get(lineList["f12"]) is not None)
                        if MAIN_STOCKS_OBJ.get(lineList["f12"]):
                            # print("sync...")
                            _code = lineList['f12']
                            _name = lineList['f14']
                            _type = int(lineList['f13'])
                            # _date = datetime.strptime("2025-04-28", "%Y-%m-%d") # datetime.now().strftime("%Y-%m-%d")
                            _date = currentDate
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
                            time.sleep(2)
                            _fund = doSyncFund(_code, _name, _type, pageNum)
                            while (_fund == False):
                                time.sleep(2)
                                _fund = doSyncFund(_code, _name, _type, pageNum)
                            
                            # print(f"_fund", not _fund)
                            # if not _fund:
                            #     continue
                            time.sleep(2)
                            _details = doSyncDetails(_code, _name, _type, _date, pageNum)
                            while (_details == False):
                                time.sleep(2)
                                _details = doSyncDetails(_code, _name, _type, _date, pageNum)

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

                            sum = sum + 1
                            file.write(f"INSERT INTO sys_stock(code,name,type,date,current,price,amount,turnover,quantity,volume,amplitude,high,low,open,prev,main_in,main_out,main_delta,large_in,large_out,large_delta,big_in,big_out,big_delta,mid_in,mid_out,mid_delta,min_in,min_out,min_delta) VALUES('{_code}','{_name}',{_type},'{_date}',{_current},{_price},{_amount},{_turnover},{_quantity},{_volume},{_amplitude},{_high},{_low},{_open},{_prev},{result[_code]["main_in"]},{result[_code]["main_out"]},{result[_code]["main_delta"]},{result[_code]["large_in"]},{result[_code]["large_out"]},{result[_code]["large_delta"]},{result[_code]["big_in"]},{result[_code]["big_out"]},{result[_code]["big_delta"]},{result[_code]["mid_in"]},{result[_code]["mid_out"]},{result[_code]["mid_delta"]},{result[_code]["min_in"]},{result[_code]["min_out"]},{result[_code]["min_delta"]});\n")
                    print("sync end...", f"{pageNum}页")
                    if totalPage > 0:
                        if pageNum == totalPage:
                            break
                    else:
                        break
                    pageNum = pageNum + 1
            except requests.exceptions.ConnectionError as err:
                print(f"获取第 {pageNum} 页 HTTP错误发生: {err} {_code} {_name}")
    print("end", f"{pageNum}页 - {sum}条")

    # print("writer start...")
    # stocks = loadJson([os.getcwd(), 'data', 'stocks.json'])
    # for code in result:
    #     stocks[code]["list"].append(result[code])
    # with open(os.path.join(os.getcwd(), 'data', 'stocks.json'), 'w', encoding='utf-8') as file:
    #     file.truncate(0)
    #     file.write(json.dumps(stocks, indent = 4, ensure_ascii = False))
    #     file.close()
    # print("writer end...")

    # with open(save_path, 'w', encoding='utf-8') as file:
    #     for key, value in MAIN_STOCKS_OBJ.items():
    #         # print(key, value)
    #         result[value["code"]] = []
    #         print(f'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={value["type"]}.{value["code"]}&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61&klt=101&fqt=1&end=20250427&lmt=317&cb=quote_jp1')
    #         response = requests.get(f'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={value["type"]}.{value["code"]}&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61&klt=101&fqt=1&end=20250427&lmt=317&cb=quote_jp1')
    #         if response.status_code == 200:
    #             jsonData = json.loads(response.text.replace("quote_jp1(", "").replace(");", ""))
    #             klines = jsonData['data']['klines']
    #             name = jsonData['data']['name']
    #             print(name, value["code"])
    #             for line in klines:
    #                 item = {}
    #                 lineList = line.split(',')
    #                 # print(lineList)
    #                 # file.write(f"INSERT INTO sys_stock(code,name,type,date,current,price,amount,turnover,quantity,volume,amplitude,high,low,open,prev) VALUES('{value["code"]}','{name}',{int(value["type"])},'{lineList[0]}',{float(lineList[2])},{float(lineList[8])},{float(lineList[9])},{float(lineList[10])},{float(lineList[5])},{float(lineList[6])},{float(lineList[7])},{float(lineList[3])},{float(lineList[4])},{float(lineList[1])},{float(lineList[2])-float(lineList[9])});\n")
    #                 item["code"] = value["code"]
    #                 item["name"] = name
    #                 item["type"] = value["type"]
    #                 item["date"] = lineList[0]
    #                 item["current"] = float(lineList[2])
    #                 item["price"] = float(lineList[8])
    #                 item["amount"] = float(lineList[9])
    #                 item["turnover"] = float(lineList[10])
    #                 item["quantity"] = float(lineList[5])
    #                 item["volume"] = float(lineList[6])
    #                 item["amplitude"] = float(lineList[7])
    #                 item["high"] = float(lineList[3])
    #                 item["low"] = float(lineList[4])
    #                 item["open"] = float(lineList[1])
    #                 item["prev"] = float(lineList[2])-float(lineList[9])
    #                 result[value["code"]].append(item)
    #     file.write(json.dumps(result, indent = 4))


# def getMinStocks():
#     for key, value in MAIN_STOCKS_ALL_OBJ.items():
#         print(key)

doSyncByLastDay(49, datetime.now().strftime("%Y-%m-%d"), 96)
# doSyncByLastDay(1)
# doSyncByKline()
# getMinStocks()