"""
Jal-Alert AI - Local Development Mock Server
Emulates AWS API Gateway + Lambda Function locally using Python's standard library.
Routes HTTP requests directly through lambda_function.lambda_handler.
"""

import sys
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from lambda_function import lambda_handler

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", 5001))

class LambdaProxyHandler(BaseHTTPRequestHandler):
    """Translates incoming HTTP requests into AWS API Gateway events for lambda_handler."""

    def _dispatch_lambda(self, method: str):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else ""

        # Construct AWS API Gateway v2 style proxy event
        event = {
            "httpMethod": method,
            "rawPath": self.path,
            "headers": dict(self.headers),
            "body": body,
            "requestContext": {
                "http": {
                    "method": method,
                    "path": self.path
                }
            }
        }

        # Invoke Lambda handler
        response = lambda_handler(event, None)

        status_code = response.get("statusCode", 200)
        headers = response.get("headers", {})
        response_body = response.get("body", "{}")

        self.send_response(status_code)
        for header_name, header_value in headers.items():
            self.send_header(header_name, header_value)
        self.end_headers()

        self.wfile.write(response_body.encode("utf-8"))

    def do_OPTIONS(self):
        self._dispatch_lambda("OPTIONS")

    def do_GET(self):
        self._dispatch_lambda("GET")

    def do_POST(self):
        self._dispatch_lambda("POST")

    def log_message(self, format, *args):
        # Clean terminal logging
        print(f"[Jal-Alert Mock Server] {self.address_string()} - {format % args}")

def run():
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, LambdaProxyHandler)
    print("=" * 65)
    print(f"[Jal-Alert AI] Mock Server running on http://127.0.0.1:{PORT}")
    print(f"[Jal-Alert AI] Simulating AWS API Gateway -> Lambda -> DynamoDB")
    print(f"[Jal-Alert AI] Endpoints available: GET /api/alerts , POST /api/reports")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Jal-Alert AI] Server shutting down cleanly...")
        httpd.server_close()

if __name__ == "__main__":
    run()
