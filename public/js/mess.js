window.addEventListener("DOMContentLoaded", () => {
  const messageDiv = document.querySelector(".alert");
  const url = document.querySelector("#url").textContent.split("?")[0];

  if (messageDiv) {
    setTimeout(() => {
      window.location.href = url;
    }, 20000);
  }
});
