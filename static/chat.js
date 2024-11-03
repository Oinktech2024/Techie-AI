// 在頁面加載時生成 session ID
const sessionId = 'session_' + Math.random().toString(36).substring(2, 15);

document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("user-input").addEventListener("keypress", (event) => {
    if (event.key === "Enter") sendMessage();
});
document.getElementById("voice-btn").addEventListener("click", toggleVoiceRecognition);
document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

let isListening = false;
let recognition;

function sendMessage() {
    const userInput = document.getElementById("user-input").value.trim();
    const errorMsg = document.getElementById("error-msg");

    if (!userInput) {
        errorMsg.textContent = "請輸入一個問題。";
        return;
    }

    errorMsg.textContent = "";
    appendMessage("user", userInput);
    document.getElementById("user-input").value = "";
    toggleSendButtonVisibility(false); // 隱藏發送按鈕

    // 顯示「正在生成中」動畫
    displayLoadingMessage();

    fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Session-ID": sessionId // 將 session ID 發送到服務器
        },
        body: JSON.stringify({ prompt: userInput })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("伺服器無法回應，請稍後再試。");
        }
        return response.json();
    })
    .then(data => {
        removeLoadingMessage(); // 移除加載消息
        typeLiyaResponse(data.response);
    })
    .catch(error => {
        errorMsg.textContent = error.message;
        logError(userInput, error.message); // 紀錄錯誤
    });
}

function displayLoadingMessage() {
    const chatBox = document.getElementById("chat-box");
    const loadingMessage = document.createElement("div");
    loadingMessage.id = "loading-message";
    loadingMessage.innerHTML = "<strong>正在生成中</strong><div class='loading-dots'></div><div class='loading-dots'></div><div class='loading-dots'></div>"; // 添加點的動畫
    chatBox.appendChild(loadingMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // 確保聊天框滾動到最新消息
}

function removeLoadingMessage() {
    const loadingMessage = document.getElementById("loading-message");
    if (loadingMessage) {
        loadingMessage.remove(); // 移除「正在生成中」的消息
    }
}

function typeLiyaResponse(response) {
    const chatBox = document.getElementById("chat-box");
    const liyaMessage = document.createElement("div"); // 使用 div 而不是 p，因為要顯示 HTML 標籤
    liyaMessage.classList.add("liya-message", "fade-in");
    liyaMessage.innerHTML = `<strong><img src='https://techieai.onrender.com/static/bot.jpg' class='bot-head' alt='Techie'></img>AI:</strong> `;
    
    response = formatResponse(response); // 格式化響應
    liyaMessage.innerHTML += response; // 將格式化後的響應添加到消息中

    chatBox.appendChild(liyaMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // 確保聊天框滾動到最新消息
    toggleSendButtonVisibility(true); // 回復發送按鈕顯示
}

function appendMessage(role, message) {
    const chatBox = document.getElementById("chat-box");
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageElement = document.createElement("p");
    messageElement.classList.add(role === "user" ? "user-message" : "liya-message", "fade-in");
    messageElement.innerHTML = `<strong>${role === "user" ? '你' : 'AI'}:</strong> ${message} <span class="timestamp">${timestamp}</span>`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // 確保聊天框滾動到最新消息
}

function toggleSendButtonVisibility(visible) {
    const sendButton = document.getElementById("send-btn");
    sendButton.style.opacity = visible ? "1" : "0"; // 根據可見性改變透明度
    sendButton.style.transition = "opacity 0.5s ease"; // 設定透明度變化的過渡效果
}

function toggleVoiceRecognition() {
    if (isListening) {
        stopVoiceRecognition();
    } else {
        startVoiceRecognition();
    }
}

function startVoiceRecognition() {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'zh-TW';
    recognition.interimResults = true; // 獲取即時結果
    isListening = true;
    document.getElementById("voice-btn").innerHTML = '<i class="fas fa-pause"></i>'; // 顯示暫停符號

    recognition.onstart = () => {
        console.log("語音識別開始，請說話...");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById("user-input").value = transcript; // 將識別到的文本放入輸入框
    };

    recognition.onerror = (event) => {
        console.error("語音識別錯誤:", event.error);
        const errorMsg = document.getElementById("error-msg");
        errorMsg.textContent = "語音識別發生錯誤，請重試。";
    };

    recognition.onend = () => {
        console.log("語音識別結束。");
        stopVoiceRecognition(); // 停止識別，返回麥克風圖標
    };

    recognition.start();
}

function stopVoiceRecognition() {
    isListening = false;
    recognition.stop(); // 停止語音識別
    document.getElementById("voice-btn").innerHTML = '<i class="fas fa-microphone"></i>'; // 返回麥克風圖標
}

function logError(userInput, errorMessage) {
    const errorLog = {
        userInput: userInput,
        errorMessage: errorMessage,
        timestamp: new Date().toISOString()
    };
    console.error("Error log:", errorLog); // 將錯誤紀錄在控制台
}

function toggleTheme() {
    document.body.classList.toggle("dark-theme");
    const themeBtn = document.getElementById("theme-toggle");
    themeBtn.innerHTML = document.body.classList.contains("dark-theme") ? 
        '<i class="fas fa-sun"></i>' : 
        '<i class="fas fa-moon"></i>';
}

function formatResponse(text) {
    // 格式化標題（# 標題，## 標題，### 標題）
    text = text.replace(/^(#{1,3})\s*(.+)$/gm, (match, hashes, content) => {
        const level = hashes.length;
        return `<h${level}>${content}</h${level}>`;
    });

    // 格式化粗體文本（**這樣**）
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="highlighted">$1</strong>');

    // 格式化斜體文本（*這樣* 或 _這樣_）
    text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

    // 格式化有序列表
    let lines = text.split("\n");
    let formattedText = "";
    let isList = false;

    lines.forEach(line => {
        if (/^\d+\.\s/.test(line)) { // 檢測排序數字
            if (!isList) {
                formattedText += "<ol class='custom-list'>";
                isList = true;
            }
            formattedText += `<li>${line.replace(/^\d+\.\s/, "")}</li>`;
        } else if (/^\* /g.test(line) || /^\- /g.test(line)) { // 檢測無序列表
            if (!isList) {
                formattedText += "<ul class='custom-list'>";
                isList = true;
            }
            formattedText += `<li>${line.replace(/^\* |^\- /, "")}</li>`;
        } else {
            if (isList) {
                formattedText += "</ol>"; // 關閉有序列表
                isList = false;
            }
            formattedText += `<p>${line}</p>`;
        }
    });

    if (isList) formattedText += "</ol>"; // 關閉未完成的列表

    // 格式化鏈接（[鏈接文字](鏈接地址)）
    formattedText = formattedText.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

    return formattedText; // 返回格式化後的文本
}
