from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import os
from dotenv import load_dotenv
import logging
import uuid

# 載入環境變量
load_dotenv()

app = Flask(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
BASE_URL = "https://api.chatanywhere.org/v1"
AI_PROMPT = os.getenv("AI_PROMPT")  # 從環境變量獲取 AI 提示詞

# 設置日誌記錄
logging.basicConfig(level=logging.ERROR)

# 保存對話歷史
conversation_history = {}

# 定義與莉亞的對話函數
def chat_with_liya(prompt, session_id):
    if session_id not in conversation_history:
        conversation_history[session_id] = []

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # 將玩家的輸入與之前的對話歷史結合
    conversation_history[session_id].append({"role": "user", "content": prompt})
    messages = [
        {"role": "system", "content": AI_PROMPT}  # 使用環境變量中的提示詞
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
        
        # 保存莉亞的回應到對話歷史
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
    session_id = request.headers.get("X-Session-ID")  # 使用 session ID 來分隔對話
    if not session_id:  # 如果沒有提供 session ID，生成一個新的
        session_id = str(uuid.uuid4())
    
    if not user_input:
        return jsonify({"response": "請輸入有效的問題。"}), 400
    
    liya_response = chat_with_liya(user_input, session_id)
    return jsonify({"response": liya_response, "session_id": session_id})

@app.route('/admin')
def admin():
    return render_template("admin.html", conversation_history=conversation_history)

@app.route('/delete/<session_id>', methods=["POST"])
def delete(session_id):
    if session_id in conversation_history:
        del conversation_history[session_id]
        return jsonify({"status": "success", "message": "對話歷史已刪除。"})
    return jsonify({"status": "error", "message": "找不到該對話歷史。"}), 404

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(app.static_folder, 'liya.jpg')

if __name__ == "__main__":
    app.run(debug=True, port=10000, host='0.0.0.0')
