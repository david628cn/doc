from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
# from fastapi.templating import Jinja2Templates
# import os
# from fastapi.templating import Jinja2Templates
# from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
# from middlewares.logger import register_logger
from controller.adminController import router as adminController
# from flask_socketio import SocketIO
# from flask_socketio import emit

app = FastAPI()

origins = [
    "*"
    # "http://127.0.0.1:3000",
    # "http://localhost:3000"
]

# 注册中间件
app.add_middleware(
    CORSMiddleware,
    # 允许所有来源的跨域请求，你也可以设置为具体的域名来限制请求来源
    allow_origins = origins,
    # 参数设置为True表示允许携带身份凭证，如cookies
    # allow_credentials = True,
    # 表示允许所有HTTP方法的请求
    allow_methods = ["*"],
    # 表示允许所有请求头
    allow_headers = ["*"],
    expose_headers = ["*"]
)

# @app.middleware("http")
# async def authorizationMiddleware(request: Request, call_next) -> Response:
#     print(request)
#     response = await call_next(request)
#     return response



# @app.route('/')
# def home():
#     return send_from_directory(os.path.join(app.root_path, 'static'), 'home.html')  # 假设你的 HTML 文件名为 home.html，位于 static 文件夹内
app.include_router(adminController, prefix="/oauth", tags=["admin"])

# socketio = SocketIO(app)

# @app.get("/")
# async def root():
#     return {"message": "Hello World"}

# @socketio.on('ws')
# def handle_my_event(data):
#     print('received event data:', data)
#     emit('response_event', {'key': 'value'})


# 静态资源目录
app.mount('/static', StaticFiles(directory="static"), name="static")
# app.state.views = Jinja2Templates(directory="templates")
# socketio = SocketIO(app, async_mode='threading')  # 或者使用 'eventlet' 或 'gevent'
