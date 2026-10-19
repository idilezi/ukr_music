async function loadBands() {
    const response = await fetch("/api/bands");
    const bands = await response.json();
    const tableBody = document.querySelector("#bands");

    tableBody.replaceChildren(...bands.map((band) => {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        const link = document.createElement("a");

        link.href = band.spotifyUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = band.name;
        cell.append(link);
        row.append(cell);
        return row;
    }));
}

loadBands().catch(() => {
    document.querySelector("#bands").innerHTML =
        '<tr><td>Не вдалося завантажити список гуртів.</td></tr>';
});