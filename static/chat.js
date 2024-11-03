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
        displayTypingIndicator(); // 顯示正在輸入的指示
        let response = data.response;

        // 模擬逐字輸出效果
        let i = 0;
        const typingSpeed = 50; // 50毫秒
        const typingInterval = setInterval(() => {
            if (i < response.length) {
                typeLiyaResponse(response.charAt(i)); // 實時更新
                i++;
            } else {
                clearInterval(typingInterval); // 停止定時器
                toggleSendButtonVisibility(true); // 回復發送按鈕顯示
            }
        }, typingSpeed);
    })
    .catch(error => {
        errorMsg.textContent = error.message;
        logError(userInput, error.message); // 紀錄錯誤
    });
}

function typeLiyaResponse(char) {
    const chatBox = document.getElementById("chat-box");
    const lastMessage = chatBox.lastElementChild;

    if (lastMessage && lastMessage.classList.contains("liya-message")) {
        lastMessage.innerHTML += char; // 實時更新內容
    } else {
        const liyaMessage = document.createElement("div");
        liyaMessage.classList.add("liya-message", "fade-in");
        liyaMessage.innerHTML = `<strong><img src='https://techieai.onrender.com/static/bot.jpg' class='bot-head' alt='Techie'></img>AI:</strong> ${char}`;
        chatBox.appendChild(liyaMessage);
    }
    
    chatBox.scrollTop = chatBox.scrollHeight; // 確保聊天框滾動到最新消息
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
    // 格式化標題
    text = text.replace(/^(#{1,6})\s*(.*?)$/gm, (match, hashes, title) => {
        const level = hashes.length; // 計算標題的層級
        return `<h${level}>${title}</h${level}>`; // 返回對應的 h 標籤
    });

    // 格式化粗體文本（**這樣** 或 __這樣__）
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="highlighted">$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong class="highlighted">$1</strong>');

    // 格式化斜體文本（*這樣* 或 _這樣_）
    text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

    // 格式化刪除線（~~這樣~~）
    text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // 格式化引用（> 這樣）
    text = text.replace(/^\> (.*)$/gm, '<blockquote>$1</blockquote>');

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

    // 格式化圖片（![描述](網址)）
    formattedText = formattedText.replace(/!\[([^\]]*)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;"/>');

    // 格式化行內代碼（`代碼`）
    formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 格式化多行代碼塊（```多行代碼```）
    formattedText = formattedText.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    return formattedText; // 返回格式化後的文本
}
