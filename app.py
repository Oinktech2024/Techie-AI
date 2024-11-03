from flask import Flask, render_template, request, jsonify, session
import requests
import os
from dotenv import load_dotenv

# 載入環境變量
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")  # 用於會話管理

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
BASE_URL = "https://api.chatanywhere.org/v1"

# 讀取角色描述
def load_character_descriptions():
    characters = {}
    with open('character_descriptions.txt', 'r', encoding='utf-8') as file:
        content = file.read()
        for section in content.split("\n\n"):
            if section.strip():
                lines = section.strip().split("\n")
                name = lines[0].strip('[]')  # 獲取角色名稱
                description = "\n".join(lines[1:])  # 獲取角色描述
                characters[name] = description
    return characters

characters = load_character_descriptions()

# 定義與角色的對話函數
def chat_with_character(prompt, character_name):
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }

    # 確保每個用戶的對話歷史是獨立的
    if 'conversation_history' not in session:
        session['conversation_history'] = []

    # 將玩家的輸入與之前的對話歷史結合
    session['conversation_history'].append({"role": "user", "content": prompt})
    messages = [
        {"role": "system", "content": characters[character_name]}
    ] + session['conversation_history']

    data = {
        "model": "gpt-3.5-turbo",
        "messages": messages
    }

    try:
        response = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        response_json = response.json()
        character_response = response_json['choices'][0]['message']['content']
        
        # 保存角色的回應到對話歷史
        session['conversation_history'].append({"role": "assistant", "content": character_response})
        return character_response
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return "抱歉，目前無法連接到伺服器，請稍後再試。"
    except KeyError:
        return "抱歉，系統回應異常，請再試一次或聯繫管理員。"

@app.route("/")
def home():
    return render_template("index.html", characters=characters.keys())

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json.get("prompt")
    character_name = request.json.get("character")  # 獲取所選角色名稱
    if not user_input or character_name not in characters:
        return jsonify({"response": "請輸入有效的問題和選擇有效的角色。"}), 400
    
    character_response = chat_with_character(user_input, character_name)
    return jsonify({"response": character_response})

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=10000)
