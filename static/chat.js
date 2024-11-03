document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("user-input").addEventListener("keypress", (event) => {
    if (event.key === "Enter") sendMessage();
});

function sendMessage() {
    const userInput = document.getElementById("user-input").value.trim();
    const errorMsg = document.getElementById("error-msg");

    if (!userInput) {
        errorMsg.textContent = "請輸入一個問題。";
        return;
    }

    errorMsg.textContent = "";
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `<p class="user-message"><strong>你:</strong> ${userInput}</p>`;
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
        chatBox.innerHTML += `<p class="liya-message"><strong>莉亞:</strong> ${data.response}</p>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch(error => {
        errorMsg.textContent = error.message;
    });
}
