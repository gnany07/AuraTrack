import http.server
import socketserver
import json
import os
import sys
import hashlib
import urllib.parse

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

# In-memory local multi-user state store for dev server
LOCAL_USERS = {}
LOCAL_USER_STATES = {}

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            req_data = json.loads(body.decode('utf-8'))
        except Exception:
            req_data = {}

        if path == '/api/sync':
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
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            else:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Sync module not found"}).encode('utf-8'))

        elif path == '/api/auth/signup':
            email = req_data.get("email", "").strip().lower()
            name = req_data.get("name", "").strip() or email.split("@")[0]
            password = req_data.get("password", "")
            
            if not email or not password:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Email and password required"}).encode('utf-8'))
                return

            user_id = "usr_" + hashlib.sha256(email.encode()).hexdigest()[:12]
            LOCAL_USERS[email] = {
                "id": user_id,
                "email": email,
                "name": name,
                "password": password
            }
            token = f"atk_{user_id}_{int(os.times().elapsed * 1000)}"
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "message": "Account created successfully",
                "user": {"id": user_id, "email": email, "name": name},
                "token": token
            }).encode('utf-8'))

        elif path == '/api/auth/login':
            email = req_data.get("email", "").strip().lower()
            password = req_data.get("password", "")
            
            user = LOCAL_USERS.get(email)
            if not user or user.get("password") != password:
                # Mock create for ease of friends testing locally
                user_id = "usr_" + hashlib.sha256(email.encode()).hexdigest()[:12]
                name = email.split("@")[0].capitalize()
                LOCAL_USERS[email] = {"id": user_id, "email": email, "name": name, "password": password}
                user = LOCAL_USERS[email]

            token = f"atk_{user['id']}_{int(os.times().elapsed * 1000)}"
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "message": "Logged in successfully",
                "user": {"id": user["id"], "email": user["email"], "name": user["name"]},
                "token": token
            }).encode('utf-8'))

        elif path == '/api/state':
            user_id = req_data.get("userId", "default_user")
            state = req_data.get("state")
            if state:
                LOCAL_USER_STATES[user_id] = state
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "userId": user_id}).encode('utf-8'))

        elif path == '/api/ai/generate':
            try:
                api_key = os.environ.get("GEMINI_API_KEY", "")
                if not api_key:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
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
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    # Override standard GET to support normal file serving and /api/state
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        if path == '/api/state':
            user_id = query.get("userId", ["default_user"])[0]
            state = LOCAL_USER_STATES.get(user_id)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "userId": user_id, "state": state}).encode('utf-8'))
        elif path.startswith('/api/'):
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
            print(f"Serving AuraTrack AI at http://localhost:{PORT} with multi-user /api/auth support")
            httpd.serve_forever()
    except Exception as e:
        print(f"Server error: {e}", file=sys.stderr)
        sys.exit(1)
