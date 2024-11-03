from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
import requests
import os
from dotenv import load_dotenv
import logging
from pymongo import MongoClient

# 載入環境變量
load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)  # 用於 session 的安全密鑰

# 從環境變量中獲取 API 密鑰和 MongoDB 連接字串
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI")
BASE_URL = "https://api.chatanywhere.org/v1"

# 設置日誌記錄
logging.basicConfig(level=logging.ERROR)

# 連接 MongoDB
client = MongoClient(MONGODB_URI)
db = client.get_default_database()
prompts_collection = db.prompts

# 保存對話歷史，以 session_id 為鍵，對話歷史為值
conversation_history = {}

# 定義與莉亞的對話函數
def chat_with_liya(prompt, session_id):
    if session_id not in conversation_history:
        conversation_history[session_id] = []

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    conversation_history[session_id].append({"role": "user", "content": prompt})
    
    messages = [
        {"role": "system", "content": (
            "你是莉亞，一位24歲的半精靈神秘學學徒和藥草師，擁有一頭波浪般的銀色長髮，"
            "穿著深綠色的長袍，性格溫和且有親和力，善於藥草治療與符文魔法，"
            "對未知事物充滿好奇，並小心保護自己擁有的秘密。"
            "請依據角色設定回答玩家的問題，保持神秘和自然的氣息。"
        )}
    ] + conversation_history[session_id]

    data = {
        "model": "gpt-4o-mini",
        "messages": messages
    }

    try:
        response = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        response_json = response.json()
        liya_response = response_json['choices'][0]['message']['content']
        
        conversation_history[session_id].append({"role": "assistant", "content": liya_response})
        return liya_response
    except requests.exceptions.RequestException as e:
        logging.error(f"Error: {e}")
        return "抱歉，目前無法連接到伺服器，請稍後再試。"
    except KeyError:
        return "抱歉，系統回應異常，請再試一次或聯繫管理員。"

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json.get("prompt")
    session_id = request.headers.get("X-Session-ID")
    if not user_input:
        return jsonify({"response": "請輸入有效的問題。"}), 400
    
    liya_response = chat_with_liya(user_input, session_id)
    return jsonify({"response": liya_response})

# 登入路由
@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        admin_username = os.getenv("ADMIN_USERNAME")
        admin_password = os.getenv("ADMIN_PASSWORD")

        if username == admin_username and password == admin_password:
            session["logged_in"] = True
            flash("登入成功！", "success")
            return redirect(url_for("admin_dashboard"))
        else:
            flash("用戶名或密碼錯誤。", "danger")

    return render_template("login.html")

# 管理員儀表板
@app.route("/admin")
def admin_dashboard():
    if not session.get("logged_in"):
        return redirect(url_for("admin_login"))
    
    prompts = list(prompts_collection.find())
    return render_template("admin.html", prompts=prompts)

# 新增提示詞
@app.route("/admin/add_prompt", methods=["POST"])
def add_prompt():
    if not session.get("logged_in"):
        return jsonify({"response": "未授權"}), 403

    new_prompt = request.json.get("prompt")
    if new_prompt:
        prompts_collection.insert_one({"prompt": new_prompt})
        return jsonify({"response": "提示詞已新增。"}), 201
    return jsonify({"response": "請提供有效的提示詞。"}), 400

# 登出路由
@app.route("/admin/logout")
def admin_logout():
    session.pop("logged_in", None)
    flash("登出成功！", "success")
    return redirect(url_for("admin_login"))

if __name__ == "__main__":
    app.run(debug=True, port=10000, host='0.0.0.0')
