# from service.stockDictService import getAll
from service.stockService import save, findList, remove
from payload.stockSyncModel import StockSyncModel
from payload.stockModel import StockModel
from payload.queryModel import QueryModel
import time
import requests
import json

def duplicate(id: int):
    queryModel = QueryModel(
        offset = None, 
        limit = None,
        filter = {
            "id": id
        },
        # order_by = {
        #     "date"
        # }
    )
    result = findList(queryModel)
    cache = {}
    # list = []
    for item in result:
        dateStr = item.date.strftime("%Y-%m-%d")
        if not cache.get(dateStr):
            cache[dateStr] = dateStr
        else:
            remove(item.id)

def sync(m: StockSyncModel):
    code = m.code
    type = m.type
    date = m.date # 20250421
    day = m.day
    response = requests.get(f'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={type}.{code}&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61&klt=101&fqt=1&end={date}&lmt={day}&cb=quote_jp1')
    if response.status_code == 200:
        jsonData = json.loads(response.text.replace("quote_jp1(", "").replace(");", ""))
        klines = jsonData['data']['klines']
        name = jsonData['data']['name']
        # if klines:
        #     klines = klines[-1]
        for line in klines:
            lineList = line.split(',')
            print(lineList, response.url)
            save(StockModel(
                code = code,
                name = name,
                type = type,
                date = f"{lineList[0]}",
                current = float(lineList[2]),
                price = float(lineList[8]),
                amount = float(lineList[9]),
                turnover = float(lineList[10]),
                quantity = float(lineList[5]),
                volume = float(lineList[6]),
                amplitude = float(lineList[7]),
                high = float(lineList[3]),
                low = float(lineList[4]),
                open = float(lineList[1]),
                prev = float(lineList[2])-float(lineList[9]),
                trends = ''
            ))

def syncAll(m: StockSyncModel):
    # result = getAll()
    result = []
    for item in result:
        m.code = item.code
        m.type = item.type
        sync(m)
    # response = requests.get('https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.600370&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61&klt=101&fqt=1&end=20250421&lmt=210&cb=quote_jp1')
    # if response.status_code == 200:
    #     jsonData = json.loads(response.text.replace("quote_jp1(", "").replace(");", ""))
    #     klines = jsonData['data']['klines']
    # save_path = os.path.join(os.getcwd(), 'sql', 'db.sql')
    # with open(save_path, 'w', encoding='utf-8') as file:
    #     for item in result:
    #         response = requests.get(f'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={item.type}.{item.code}&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61&klt=101&fqt=1&end=20250421&lmt=210&cb=quote_jp1')
    #         if response.status_code == 200:
    #             jsonData = json.loads(response.text.replace("quote_jp1(", "").replace(");", ""))
    #             klines = jsonData['data']['klines']
    #             name = jsonData['data']['name']
    #             for line in klines:
    #                 lineList = line.split(',')
    #                 print(lineList)
    #                 file.write(f"INSERT INTO stock(code,name,type,date,current,price,amount,turnover,quantity,volume,amplitude,high,low,open,prev) VALUES('{item.code}','{name}',{int(item.type)},'{lineList[0]}',{float(lineList[2])},{float(lineList[8])},{float(lineList[9])},{float(lineList[10])},{float(lineList[5])},{float(lineList[6])},{float(lineList[7])},{float(lineList[3])},{float(lineList[4])},{float(lineList[1])},{float(lineList[2])-float(lineList[9])});\n")