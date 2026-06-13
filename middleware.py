from starlette.types import ASGIApp, Scope, Receive, Send


CORS_HEADERS = [
    (b"access-control-allow-origin", b"https://vinkspace.fun"),
    (b"access-control-allow-methods", b"GET, POST, PUT, DELETE, PATCH, OPTIONS"),
    (b"access-control-allow-headers", b"authorization, content-type, x-requested-with, accept"),
    (b"access-control-max-age", b"600"),
    (b"access-control-allow-credentials", b"false"),
]


class ForceCORSMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            if scope["method"] == "OPTIONS":
                await send({
                    "type": "http.response.start",
                    "status": 200,
                    "headers": CORS_HEADERS,
                })
                await send({"type": "http.response.body", "body": b""})
                return

            async def send_with_cors(message):
                if message["type"] == "http.response.start":
                    headers = list(message.get("headers", []))
                    headers.extend(CORS_HEADERS)
                    message["headers"] = headers
                await send(message)

            await self.app(scope, receive, send_with_cors)
        else:
            await self.app(scope, receive, send)
