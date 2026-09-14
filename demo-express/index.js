const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    console.log(req.query);
    res.json("Bienvenue sur mon serveur Express!");
});

app.listen(3000, ()=> {
    console.log("Serveur démarré sur http://localhost:3000");
})
