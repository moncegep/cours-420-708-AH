import express from 'express';

const app = express();
app.use(express.json()); // interprète le corps JSON des requêtes

// Base de données (en mémoire)
const students = [
    { id: 1, nom: "Henri", inscription: "2025-01-01" },
    { id: 2, nom: "Jeremy", inscription: "2025-06-01" },
    { id: 3, nom: "Sophie", inscription: "2024-12-01" },
];
let nextId = 4;

app.get('/students', (req, res) => {
    const { q } = req.query;

    let result = students;
    let normQ = q.trim();

    if (normQ) {
        result = students.filter(student => student.nom.toLocaleLowerCase().includes(normQ));
    }

    res.json(result);
});

app.get('/students/:id', (req, res) => {
    const { id } = req.params;

    let convId = Number.parseInt(id);

    if (!convId) {
        res.status(400).json({ message: `Le paramètre id (${id}) est erroné (valeur entière attendue)` })
        return;
    }

    let student = students.find(student => student.id === convId);

    if (student === undefined) {
        res.status(404).json({ message: `Aucun etudiant ne correspond a cet identifiant (${id})` });
        return;
    }

    res.json(student);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});