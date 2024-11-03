document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("user-input").addEventListener("keypress", (event) => {
    if (event.key === "Enter") sendMessage();
});

function sendMessage() {
    const userInput = document.getElementById("user-input").value.trim();
    const characterName = document.getElementById("character-select").value; // 獲取選擇的角色
    const errorMsg = document.getElementById("error-msg");

    if (!userInput) {
        errorMsg.textContent = "請輸入一個問題。";
        return;
    }

    errorMsg.textContent = "";
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `<p class="user-message"><strong>你:</strong> ${userInput}</p>`;
    document.getElementById("user-input").value = "";

    // 發送請求到伺服器
    fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: userInput, character: characterName }) // 傳送角色名稱
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("伺服器無法回應，請稍後再試。");
        }
        return response.json();
    })
    .then(data => {
        // 使用逐步顯示的方式輸出角色的回應
        typeMessage(data.response);
    })
    .catch(error => {
        errorMsg.textContent = error.message;
    });
}

// 逐步顯示訊息的函數
function typeMessage(message) {
    const chatBox = document.getElementById("chat-box");
    let index = 0;
    const liyaMessageElement = document.createElement('p');
    liyaMessageElement.className = "liya-message";
    liyaMessageElement.innerHTML = `<strong>${document.getElementById("character-select").value}:</strong> `;
    chatBox.appendChild(liyaMessageElement);

    const interval = setInterval(() => {
        if (index < message.length) {
            liyaMessageElement.innerHTML += message.charAt(index);
            chatBox.scrollTop = chatBox.scrollHeight; // 滾動到最新消息
            index++;
        } else {
            clearInterval(interval); // 清除計時器
        }
    }, 50); // 每 50 毫秒顯示一個字符
}
