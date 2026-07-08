document.getElementById("requestForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const reason = document.getElementById("reason").value;

  const res = await fetch("http://localhost:3000/api/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, reason })
  });

  const data = await res.json();
  document.getElementById("message").innerText = data.message;
});
