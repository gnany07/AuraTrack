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

# Helper to load .env file
def load_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()

load_env()

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

        elif self.path == '/api/ai/generate':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length) if content_length > 0 else b'{}'
                req_data = json.loads(body.decode('utf-8'))
                
                api_key = os.environ.get("GEMINI_API_KEY", "")
                if not api_key:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "No GEMINI_API_KEY set in server .env"}).encode('utf-8'))
                    return

                prompt = req_data.get("prompt", "")
                system_instruction = req_data.get("systemInstruction", "")
                model = req_data.get("model", "gemini-2.5-flash")

                import urllib.request
                gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                
                payload = {
                    "contents": [{
                        "parts": [{
                            "text": f"[System Context: {system_instruction}]\n\n{prompt}" if system_instruction else prompt
                        }]
                    }]
                }
                
                gemini_req = urllib.request.Request(
                    gemini_url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={"Content-Type": "application/json"}
                )
                
                with urllib.request.urlopen(gemini_req) as g_resp:
                    g_data = json.loads(g_resp.read().decode('utf-8'))
                    candidates = g_data.get("candidates", [])
                    text = ""
                    if candidates and candidates[0].get("content", {}).get("parts"):
                        text = candidates[0]["content"]["parts"][0].get("text", "")
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "result": text}).encode('utf-8'))

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
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
