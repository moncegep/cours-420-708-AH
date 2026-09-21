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

function getStudent(id) {
    let convId = Number.parseInt(id);

    if (!convId) {
        throw `Le paramètre id (${id}) est erroné (valeur entière attendue)`;
    }

    return students.find(student => student.id === convId);
}

function validateName(){
    
}

function validateInscription(){

}

app.get('/students', (req, res) => {
    const { q } = req.query;

    let result = students;
    let normQ = q?.trim();

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

app.post('/students', (req, res) => {
    const { nom, inscription } = req.body;

    if (!nom || nom.trim() == "" || nom.trim().length < 2 || nom.trim().length > 300) {
        res.status(400).json({ message: `Le paramètre nom (${nom}) n'est pas valide` })
        return;
    }

    if (!inscription || inscription.trim() == "" || !Date.parse(inscription)) {
        res.status(400).json({ message: `Le paramètre inscription (${inscription}) n'est pas valide` })
        return;
    }

    let newStudent = {
        id: nextId++,
        nom: nom,
        inscription: inscription
    };

    students.push(newStudent);

    res.status(201).location(`/students/${newStudent.id}`).json(newStudent);
});

app.put('/students/:id', (req, res) => {
    // 1. Recuperer l'etudiant correspondant à l'id reçu
    const { id } = req.params;

    try {
        let student = getStudent(id);
        if (student === undefined) {
            res.status(404).json({ message: `Aucun etudiant ne correspond a cet identifiant (${id})` });
            return;
        }
    } catch (error) {
        res.status(error.code).json({ message: error.message });
    }

    // 2. Recuperer les nouvelles données de l'étudiant
    const { nom, inscription } = req.body;

    if (!nom || nom.trim() == "" || nom.trim().length < 2 || nom.trim().length > 300) {
        res.status(400).json({ message: `Le paramètre nom (${nom}) n'est pas valide` })
        return;
    }

    if (!inscription || inscription.trim() == "" || !Date.parse(inscription)) {
        res.status(400).json({ message: `Le paramètre inscription (${inscription}) n'est pas valide` })
        return;
    }

    // 3. Mettre à jour les données de l'étudiant
    student.nom = nom;
    student.inscription = inscription;

    let index = students.findIndex(stud => stud.id === student.id);
    students[index] = student;

    res.json(student);
});

app.delete("/students/:id", (req, res) => {
    // 1. Recuperer l'etudiant correspondant à l'id reçu
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

    // 2. Supprimer l'étudiant
    let index = students.findIndex(stud => stud.id === student.id);
    students.splice(index, 1);

    res.json({ message: `Etudiant ${student.nom} (${student.id}) supprimé` });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});