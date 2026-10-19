const loginForm = document.querySelector("#login-form");
const panel = document.querySelector("#panel");
const message = document.querySelector("#message");
const bandList = document.querySelector("#band-list");

function showMessage(text) {
    message.textContent = text;
}

async function loadBands() {
    const response = await fetch("/api/bands");
    const bands = await response.json();
    bandList.replaceChildren(...bands.map((band) => {
        const item = document.createElement("li");
        const removeButton = document.createElement("button");

        item.textContent = band.name;
        removeButton.textContent = "Видалити";
        removeButton.addEventListener("click", async () => {
            const deleteResponse = await fetch(`/api/bands/${band.id}`, { method: "DELETE" });
            if (!deleteResponse.ok) {
                showMessage("Не вдалося видалити гурт.");
                return;
            }
            await loadBands();
        });
        item.append(" ", removeButton);
        return item;
    }));
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: document.querySelector("#password").value })
    });

    if (!response.ok) {
        showMessage("Неправильний пароль.");
        return;
    }
    loginForm.hidden = true;
    panel.hidden = false;
    await loadBands();
});

document.querySelector("#band-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const response = await fetch("/api/bands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: document.querySelector("#name").value,
            spotifyUrl: document.querySelector("#spotify-url").value
        })
    });

    if (!response.ok) {
        const result = await response.json();
        showMessage(result.error);
        return;
    }
    event.target.reset();
    await loadBands();
});

document.querySelector("#logout").addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    panel.hidden = true;
    loginForm.hidden = false;
});
