async function getData() {
    const url = "https://api.cafesansfil.ca/v1/cafes";
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();

        document.querySelector("#data").innerHTML = result.items.map((item) => {
            return `
                <div>
                    <p>${item.name}</p>
                </div>
        `}).join("")
    } catch (error) {
        console.error(error.message);
    }
}

getData();

