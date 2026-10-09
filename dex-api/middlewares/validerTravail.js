import { trouverTravail } from "../dataService.js";

export function validerTravail(req, res, next) {
    const { id } = req.params;
    const travail = trouverTravail(id);

    if (travail === null) {
        res.status(404).json({ message: `Le travail ${id} n'existe pas.` });
        return;
    }

    next();
}