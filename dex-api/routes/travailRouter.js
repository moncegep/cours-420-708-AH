import { Router } from "express";
import { validerTravail } from "./../middlewares/validerTravail.js" ;
import { trouverTravail } from "../dataService.js";
import { validateToken } from "../utils.js";
import { getUtilisateur } from "../authService.js";


function estConnecte(req, res, next) {
    const token =  req.headers["x-auth-token"];

    if(!validateToken(token)) {
        return res.status(401).json({
            erreur: "Utilisateur non connecté",
        })
    }

    const utilisateur = getUtilisateur(token);

     if(utilisateur === null) {
        return res.status(401).json({
            erreur: "Utilisateur non reconnu",
        });
    }

    next();
}

function estEnseignant(req, res, next) {
    const token =  req.headers["x-auth-token"];

    if(!validateToken(token)) {
        return res.status(401).json({
            erreur: "Utilisateur non connecté",
        })
    }

    const utilisateur = getUtilisateur(token);

    if(utilisateur.role !== 'enseignant') {
        return res.status(403).json({
            erreur: "Action non autorisée",
        });
    }

    next();
}


const travailRouter  = Router();


let disponibilites = []

// Récupérer tous les travaux ouverts par défaut.
// ?cours=serveur  filtre par cours
travailRouter.get("/", (req, res) => {
    const { cours } = req.query;

    const travaux = listerTravaux(cours);

    res.json(travaux);
});

// Récupérer un travail à l'aide de son identifiant.
travailRouter.get("/:id", validerTravail, (req, res) => {
    const { id } = req.params;
    const travail = trouverTravail(id);

    res.json(travail);
});


travailRouter.post("/:id/disponibilites", validerTravail, (req, res) => {
    const { id } = req.params;
    const { utilisateurId, creneaux } = req.body;

    if (!utilisateurId) {
        res.status(400).json({ message: `Le paramètre utilisateurId est obligatoire.` });
        return;
    }

    if (!creneaux || !Array.isArray(creneaux)) {
        res.status(400).json({ message: `Le paramètre creneaux est obligatoire.` });
        return;
    }

    const utilisateur = trouverUtilisateur(utilisateurId);

    if (utilisateur === null) {
        res.status(404).json({ message: `L'utilisateur ${id} n'existe pas.` });
        return;
    }

    creneaux.forEach(creneauId => {
        const creneau = trouverCreneau(creneauId);

        if (creneau === null) {
            res.status(404).json({ message: `Le créneau ${creneauId} n'existe pas.` });
            return;
        }
    });

    let dispoResultat = []

    // supprimer les disponibilitées
    for (let i = 0; i < disponibilites.length; i++) {
        const element = disponibilites[i];
        if (element.travail === id && element.utilisateurId === utilisateurId) {
            continue;
        }
        dispoResultat.push(element);
    }

    // ajouter nouveau creneau
    creneaux.forEach(creneau => {
        dispoResultat.push({
            travail: id,
            utilisateurId: utilisateurId,
            creneau: creneau
        });
    });

    // ecraser l'ancienne liste des disponibilités
    disponibilites = dispoResultat;

    res.status(201).json(disponibilites);
});


travailRouter.delete("/:id/disponibilites", estEnseignant, (req, res) => {
    let dispoResultat = []

    // supprimer les disponibilitées
    for (let i = 0; i < disponibilites.length; i++) {
        const element = disponibilites[i];
        if (element.travail === id) {
            continue;
        }
        dispoResultat.push(element);
    }

    disponibilites = dispoResultat;

    res.status(200).json({message : "Disponibilités supprimées avec succès!"});
});

export default travailRouter;