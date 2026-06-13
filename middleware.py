from starlette.types import ASGIApp, Scope, Receive, Send
from starlette.responses import Response


class ForceCORSMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            if scope["method"] == "OPTIONS":
                headers = [
                    (b"access-control-allow-origin", b"https://vinkspace.fun"),
                    (b"access-control-allow-methods", b"GET, POST, PUT, DELETE, PATCH, OPTIONS"),
                    (b"access-control-allow-headers", b"authorization, content-type, x-requested-with, accept"),
                    (b"access-control-max-age", b"600"),
                    (b"access-control-allow-credentials", b"false"),
                ]
                response = Response(status_code=200, headers=dict(headers))
                await response(scope, receive, send)
                return

            async def send_with_cors(message):
                if message["type"] == "http.response.start":
                    headers = list(message.get("headers", []))
                    headers.append((b"access-control-allow-origin", b"https://vinkspace.fun"))
                    headers.append((b"access-control-allow-methods", b"GET, POST, PUT, DELETE, PATCH, OPTIONS"))
                    headers.append((b"access-control-allow-headers", b"authorization, content-type, x-requested-with, accept"))
                    headers.append((b"access-control-allow-credentials", b"false"))
                    message["headers"] = headers
                await send(message)

            await self.app(scope, receive, send_with_cors)
        else:
            await self.app(scope, receive, send)
