import { DATA } from "./data.js"
import express from 'express';
import { listerCours, trouverCours, listerCreneaux, trouverCreneau, listerTravaux, trouverTravail } from "./dataService.js";

const app = express();
app.use(express.json())

// Petite page d'accueil retournant la liste des routes disponibles.
app.get("/", (req, res) => {
    res.json({
        service: "API de la plateforme DEX",
        routes: [
            "GET /cours", "GET /cours/:id",
            "GET /creneaux", "GET /creneaux/:id",
            "GET /travaux", "GET /travaux?cours=serveur", "GET /travaux/:id",
        ],
    });
});

// Récupérer tous les cours.
app.get("/cours", (req, res) => {
    const result = listerCours();

    res.json(result);
});

// Récupérer un cours à l'aide de son identifiant.
app.get("/cours/:id", (req, res) => {
    const { id } = req.params;
    const cours = trouverCours(id);

    if (cours === null) {
        res.status(404).json({ message: `Le cours ${id} n'existe pas.` });
        return;
    }

    res.json(cours);
});

// Récupérer tous les créneaux.
app.get("/creneaux", (req, res) => {
    res.json(listerCreneaux());
});

// Récupérer un créneau à l'aide de son identifiant.
app.get("/creneaux/:id", (req, res) => {
    const { id } = req.params;
    const creneau = trouverCreneau(id);

    if (creneau === null) {
        res.status(404).json({ message: `Le créneau ${id} n'existe pas.` });
        return;
    }

    res.json(creneau);
});

// Récupérer tous les travaux ouverts par défaut.
// ?cours=serveur  filtre par cours
app.get("/travaux", (req, res) => {
    const { cours } = req.query;

    const travaux = listerTravaux(cours);

    res.json(travaux);
});

// Récupérer un travail à l'aide de son identifiant.
app.get("/travaux/:id", (req, res) => {
    const { id } = req.params;
    const travail = trouverTravail(id);

    if (travail === null) {
        res.status(404).json({ message: `Le travail ${id} n'existe pas.` });
        return;
    }

    res.json(travail);
});


// Chemin inconnu.
app.use((req, res) => {
    res.status(404).json({ message: `Route inconnue : ${req.method} ${req.originalUrl}` });
});

// Dernier filet : toute erreur non interceptée arrive ici.
app.use((erreur, req, res, next) => {
    console.error(erreur);
    res.status(500).json({ message: "Erreur interne du service." });
});


const PORT = process.env.PORT ?? 5000;

app.listen(PORT, () => {
    console.log(`API de la plateforme démarrée sur http://localhost:${PORT}`);
});