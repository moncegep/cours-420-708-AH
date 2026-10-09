import { DATA } from "./data.js"
import express from 'express';
import { listerCours, trouverCours, listerCreneaux, trouverCreneau, listerTravaux, trouverTravail, trouverUtilisateur } from "./dataService.js";
import travailRouter from "./routes/travailRouter.js";
import authRouter from "./routes/authRouter.js";

const app = express();
app.use(express.json());

export function verifierCle(req, res, next) {
    if (!req.headers["x-api-key"]) {
        return res.status(401).json({
            erreur: "clé manquante",
        });
    }

    next();
}


// app.use(verifierCle);


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
app.get("/cours", verifierCle, (req, res) => {
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

app.use("/", authRouter);
app.use("/travaux", travailRouter);

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