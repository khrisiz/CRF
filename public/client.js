document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  // Pairing
  socket.on("paired", (partnerId) => {
    console.log("You are paired with:", partnerId);
  });

  // Messages
  socket.on("message", (msg) => {
    console.log("Partner:", msg);
  });

  function sendMessage(msg) {
    socket.emit("message", msg);
  }

  // Tip system
  socket.on("tip", ({ from, amount }) => {
    alert(`💰 You received a tip of $${amount} from ${from || "someone"}!`);
  });

  const tipBtn = document.getElementById("tipBtn");
  const tipInput = document.getElementById("tipAmount");
  if (tipBtn && tipInput) {
    tipBtn.addEventListener("click", () => {
      const amount = parseInt(tipInput.value, 10);
      if (!isNaN(amount) && amount > 0) {
        socket.emit("tip", { from: "You", amount });
      } else {
        alert("Please enter a valid tip amount.");
      }
    });
  }

  // Consent banner
  function showConsentBanner() {
    if (!localStorage.getItem("adsConsent")) {
      document.getElementById("consent-banner").style.display = "block";
    }
  }
  document.getElementById("consent-accept").onclick = function () {
    localStorage.setItem("adsConsent", "accepted");
    document.getElementById("consent-banner").style.display = "none";
  };
  document.getElementById("consent-decline").onclick = function () {
    localStorage.setItem("adsConsent", "declined");
    document.getElementById("consent-banner").style.display = "none";
  };
  showConsentBanner();

  // Free tip banner
  document.getElementById("closeFreeTip").onclick = function () {
    document.getElementById("free-tip-banner").style.display = "none";
  };
  document.getElementById("freeTipBtn").onclick = function () {
    alert("Thank you for your support! (This is a free tip)");
    document.getElementById("free-tip-banner").style.display = "none";
    // socket.emit("freeTip");
  };
});

