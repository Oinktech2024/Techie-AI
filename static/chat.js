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
        typeLiyaResponse(data.response);
    })
    .catch(error => {
        errorMsg.textContent = error.message;
        logError(userInput, error.message); // 紀錄錯誤
    });
}

function typeLiyaResponse(response) {
    const chatBox = document.getElementById("chat-box");
    const liyaMessage = document.createElement("div"); // 使用 div 而不是 p，因為要顯示 HTML 標籤
    liyaMessage.classList.add("liya-message", "fade-in");
    liyaMessage.innerHTML = `<strong><img src='https://techieai.onrender.com/static/bot.jpg' class='bot-head' alt='Techie'></img>AI:</strong> `;
    
    // 將消息添加到聊天框
    chatBox.appendChild(liyaMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // 確保聊天框滾動到最新消息

    // 逐步顯示回應
    let index = 0;
    const typingSpeed = 50; // 每個字符的延遲（毫秒）

    function typeCharacter() {
        if (index < response.length) {
            const formattedChar = formatCharacter(response[index]);
            liyaMessage.innerHTML += formattedChar; // 添加格式化字符
            index++;
            chatBox.scrollTop = chatBox.scrollHeight; // 確保聊天框滾動到最新消息
            setTimeout(typeCharacter, typingSpeed); // 設定下一個字符的顯示
        } else {
            toggleSendButtonVisibility(true); // 回復發送按鈕顯示
        }
    }

    typeCharacter(); // 開始顯示字符
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
    formattedText = formattedText.replace(/\[([^\]]+)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 格式化代碼（`代碼` 和 ```多行代碼```）
    formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>');
    formattedText = formattedText.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    return formattedText; // 返回格式化後的文本
}

// 實時格式化每個字符
function formatCharacter(char) {
    // 支持的 Markdown 語法
    const bold = /\*\*(.*?)\*\*/g; // 粗體
    const italic = /(\*|_)(.*?)\1/g; // 斜體
    const link = /\[([^\]]+)\]\((.*?)\)/g; // 鏈接
    const code = /`([^`]+)`/g; // 單行代碼
    const multiCode = /```([\s\S]*?)```/g; // 多行代碼

    char = char.replace(bold, '<strong>$1</strong>');
    char = char.replace(italic, '<em>$2</em>');
    char = char.replace(link, '<a href="$2" target="_blank">$1</a>');
    char = char.replace(code, '<code>$1</code>');
    char = char.replace(multiCode, '<pre><code>$1</code></pre>');

    return char;
}
