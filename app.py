from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv
import logging

# 載入環境變量
load_dotenv()

app = Flask(__name__)

# 從環境變量中獲取 API 密鑰
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
BASE_URL = "https://api.chatanywhere.org/v1"

# 設置日誌記錄
logging.basicConfig(level=logging.ERROR)

# 保存對話歷史，以 session_id 為鍵，對話歷史為值
conversation_history = {}

# 定義與莉亞的對話函數
def chat_with_liya(prompt, session_id):
    # 如果該 session_id 尚不存在於對話歷史中，則初始化
    if session_id not in conversation_history:
        conversation_history[session_id] = []

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # 將用戶的輸入添加到對話歷史中
    conversation_history[session_id].append({"role": "user", "content": prompt})
    
    # 構建訊息列表
    messages = [
        {"role": "system", "content": (
            "你是莉亞，一位24歲的半精靈神秘學學徒和藥草師，擁有一頭波浪般的銀色長髮，"
            "穿著深綠色的長袍，性格溫和且有親和力，善於藥草治療與符文魔法，"
            "對未知事物充滿好奇，並小心保護自己擁有的秘密。"
            "請依據角色設定回答玩家的問題，保持神秘和自然的氣息。"
        )}
    ] + conversation_history[session_id]

    # 準備請求數據
    data = {
        "model": "gpt-4o-mini",
        "messages": messages
    }

    try:
        # 向 API 發送請求
        response = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        response_json = response.json()
        liya_response = response_json['choices'][0]['message']['content']
        
        # 將莉亞的回應添加到對話歷史中
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
    if not user_input:
        return jsonify({"response": "請輸入有效的問題。"}), 400
    
    liya_response = chat_with_liya(user_input, session_id)
    return jsonify({"response": liya_response})

if __name__ == "__main__":
    app.run(debug=True,port=10000, host='0.0.0.0')
