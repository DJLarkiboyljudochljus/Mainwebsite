// public/js/simulator.js
document.addEventListener("DOMContentLoaded", () => {
  const track1 = document.getElementById("track1");
  const track2 = document.getElementById("track2");
  const volume = document.getElementById("volume");
  const strobe = document.getElementById("strobe");
  const pulse = document.getElementById("pulse");
  const fade = document.getElementById("fade");
  const crowdVibe = document.getElementById("crowd-vibe");
  const crowdAnimation = document.getElementById("crowd-animation");

  // Volume control
  volume.addEventListener("input", (e) => {
    const vol = e.target.value;
    track1.volume = vol;
    track2.volume = vol;
  });

  // Lighting effects
  strobe.addEventListener("click", () => {
    crowdAnimation.className = "strobe";
  });

  pulse.addEventListener("click", () => {
    crowdAnimation.className = "pulse";
  });

  fade.addEventListener("click", () => {
    crowdAnimation.className = "fade";
  });

  // Crowd vibes
  crowdVibe.addEventListener("input", (e) => {
    const intensity = e.target.value;
    crowdAnimation.style.opacity = intensity / 100;
  });
});
