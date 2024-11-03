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

    fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
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
    const liyaMessage = document.createElement("p");
    liyaMessage.classList.add("liya-message", "fade-in");
    liyaMessage.innerHTML = `<strong>莉亞:</strong> `;
    chatBox.appendChild(liyaMessage);
    
    let index = 0;
    const typingInterval = setInterval(() => {
        if (index < response.length) {
            liyaMessage.innerHTML += response.charAt(index);
            index++;
            chatBox.scrollTop = chatBox.scrollHeight; // 確保聊天框滾動到最新消息
        } else {
            clearInterval(typingInterval);
        }
    }, 50); // 調整速度
}

function appendMessage(role, message) {
    const chatBox = document.getElementById("chat-box");
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageElement = document.createElement("p");
    messageElement.classList.add(role === "user" ? "user-message" : "liya-message", "fade-in");
    messageElement.innerHTML = `<strong>${role === "user" ? '你' : '莉亞'}:</strong> ${message} <span class="timestamp">${timestamp}</span>`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // 確保聊天框滾動到最新消息
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
