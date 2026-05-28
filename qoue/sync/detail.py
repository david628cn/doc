import requests
import json
import os
import re
from stockData import MAIN_STOCKS_OBJ

cookies_str = 'qgqp_b_id=90672b8a757593658f7f51013d87539f; st_nvi=oiUBtiJhY6yrkfw2NjDSe98c9; nid=06c1236e9e1b1460187fcb22446deb5f; nid_create_time=1758614485038; gvi=zEYmGUb7o5NU5DonqyRPya975; gvi_create_time=1758614485038; st_si=85913851905698; fullscreengg=1; fullscreengg2=1; st_asi=delete; st_pvi=12807136001264; st_sp=2025-05-25%2001%3A02%3A54; st_inirUrl=https%3A%2F%2Fquote.eastmoney.com%2Fconcept%2Fsh601288.html; st_sn=14; st_psi=20251017043509547-113200354966-4455534280'
cookies_dict = {}
for cookie in cookies_str.split('; '):
    key, value = cookie.split('=', 1)
    cookies_dict[key] = value

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
            with open(os.path.join(os.getcwd(), 'data', '_trade', f"{code}-{date}.json"), 'w', encoding='utf-8') as f:
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
    
def main():
    count = 0
    for stocks in MAIN_STOCKS_OBJ:
        count = count + 1
        print(f"{MAIN_STOCKS_OBJ[stocks]["type"]}.{MAIN_STOCKS_OBJ[stocks]["code"]}")
    print(count)
main()