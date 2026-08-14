import http.server
import socketserver
import json
import os
import sys

# Import the compile_all function from fetch_jobs.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from fetch_jobs import compile_all
except ImportError:
    compile_all = None

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/sync':
            if compile_all:
                try:
                    count, timestamp = compile_all()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response = {
                        "status": "success",
                        "message": f"Successfully synced {count} jobs!",
                        "timestamp": timestamp
                    }
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            else:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Sync module not found"}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    # Override standard GET to support normal file serving
    def do_GET(self):
        if self.path.startswith('/api/'):
            self.send_response(404)
            self.end_headers()
        else:
            super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
            print(f"Serving AuraTrack AI at http://localhost:{PORT} with live /api/sync support")
            httpd.serve_forever()
    except Exception as e:
        print(f"Server error: {e}", file=sys.stderr)
        sys.exit(1)
