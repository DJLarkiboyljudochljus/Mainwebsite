const socket = io();

socket.emit("join", userid);

const sendMessage = () => {
  const messageEl = document.querySelector("#message");
  const message = messageEl.value;
  const messageContainer = document.querySelector("#messages");
  const recipient = document.querySelector("#recipient");

  const messageData = {
    content: message,
    receiverId: recipient.dataset.id,
    senderId: userid,
  };

  console.log("Sending message:", messageData);

  socket.emit("message", messageData);
  const messageElement = document.createElement("div");
  messageElement.innerText = `You: ${message}`;
  messageContainer.appendChild(messageElement);

  messageElement.scrollIntoView({
    behavior: "smooth",
    block: "end",
  });

  messageEl.value = "";
  messageEl.focus();
};

document.querySelector("#send-button").addEventListener("click", (e) => {
  e.preventDefault();
  sendMessage();
});

document.querySelector("#message").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

socket.on("message", (data) => {
  const messageContainer = document.querySelector("#messages");
  const messageElement = document.createElement("div");
  messageElement.innerText = `${data.senderId}: ${data.message}`;
  messageContainer.appendChild(messageElement);
});

const users = document.querySelectorAll(".user-item");
users.forEach((user) => {
  user.addEventListener("click", (e) => {
    const selectedUserId = e.currentTarget.dataset.id;
    const selectedUserName =
      e.currentTarget.querySelector(".user-name").innerText;
    const recipientElement = document.querySelector("#recipient");

    recipientElement.innerText = selectedUserName;
    recipientElement.dataset.id = selectedUserId;

    users.forEach((u) => {
      u.classList.remove("selected");
    });
    e.currentTarget.classList.add("selected");
  });
});
