window.addEventListener("DOMContentLoaded", function () {
  // Create a new audio element
  const soundEffect = new Audio("/audio/404_music.wav"); // Adjust the file path if needed

  document.body.addEventListener("mousedown", () => {
    soundEffect.play();
  });

  document.querySelector("#go-back-btn").addEventListener("click", () => {
    window.history.back();
  });
});
