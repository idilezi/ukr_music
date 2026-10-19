const path = require("node:path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const adminPassword = process.env.ADMIN_PASSWORD;
const sessionSecret = process.env.SESSION_SECRET;

if (!adminPassword || !sessionSecret) {
    throw new Error("ADMIN_PASSWORD and SESSION_SECRET environment variables are required.");
}

const adminPasswordHash = bcrypt.hashSync(adminPassword, 10);
const app = express();
const database = new Database(path.join(__dirname, "bands.db"));

database.exec(`
    CREATE TABLE IF NOT EXISTS bands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        spotify_url TEXT NOT NULL
    )
`);

app.use(express.json());
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 8
    }
}));
app.use((request, response, next) => {
    if (["/server.js", "/package.json", "/package-lock.json", "/bands.db"].includes(request.path)) {
        return response.status(404).end();
    }
    next();
});
app.use(express.static(__dirname));

const requireAdmin = (request, response, next) => {
    if (!request.session.isAdmin) {
        return response.status(401).json({ error: "Потрібна авторизація адміністратора." });
    }
    next();
};

app.get("/api/bands", (request, response) => {
    const bands = database
        .prepare("SELECT id, name, spotify_url AS spotifyUrl FROM bands ORDER BY id")
        .all();
    response.json(bands);
});

app.post("/api/admin/login", (request, response) => {
    const { password } = request.body;

    if (typeof password !== "string" || !bcrypt.compareSync(password, adminPasswordHash)) {
        return response.status(401).json({ error: "Неправильний пароль." });
    }

    request.session.isAdmin = true;
    response.json({ success: true });
});

app.post("/api/admin/logout", requireAdmin, (request, response) => {
    request.session.destroy((error) => {
        if (error) {
            return response.status(500).json({ error: "Не вдалося завершити сесію." });
        }
        response.json({ success: true });
    });
});

app.post("/api/bands", requireAdmin, (request, response) => {
    const { name, spotifyUrl } = request.body;
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedSpotifyUrl = typeof spotifyUrl === "string" ? spotifyUrl.trim() : "";

    if (!trimmedName || !/^https:\/\/open\.spotify\.com\/(artist|search)\//.test(trimmedSpotifyUrl)) {
        return response.status(400).json({
            error: "Вкажіть назву та коректне посилання Spotify."
        });
    }

    const result = database
        .prepare("INSERT INTO bands (name, spotify_url) VALUES (?, ?)")
        .run(trimmedName, trimmedSpotifyUrl);
    response.status(201).json({ id: result.lastInsertRowid });
});

app.delete("/api/bands/:id", requireAdmin, (request, response) => {
    const result = database
        .prepare("DELETE FROM bands WHERE id = ?")
        .run(request.params.id);

    if (result.changes === 0) {
        return response.status(404).json({ error: "Гурт не знайдено." });
    }
    response.status(204).end();
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Сервер запущено: http://localhost:${process.env.PORT || 3000}`);
});
