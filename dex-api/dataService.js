// Accès aux données de la plateforme.

import { DATA } from "./data.js";

// Transforme un objet « identifiant => valeur » en tableau d'objets.
function enListe(objet, nomDuChamp) {
    return Object.entries(objet).map(([id, valeur]) => ({ id, [nomDuChamp]: valeur }));
}

export function listerCours() {
    return enListe(DATA.cours, "titre");
}

export function trouverCours(id) {
    if (!Object.hasOwn(DATA.cours, id)) {
        return null;
    }

    const titre = DATA.cours[id];

    return { id, titre };
}

export function listerCreneaux() {
    return enListe(DATA.creneaux, "libelle");
}

export function trouverCreneau(id) {
    if (!Object.hasOwn(DATA.creneaux, id)) {
        return null;
    }

    const libelle = DATA.creneaux[id];

    return { id, libelle };
}

export function listerTravaux(cours, ouvert = true) {
    // La copie par décomposition évite de modifier les données d'origine.
    let travaux = Object.entries(DATA.travaux).map(([id, travail]) => ({ id, ...travail }));

    // equivalent de Object.entries(DATA.travaux).map(...);
    // let travaux = [];
    // for (const id in DATA.travaux) {
    //     const travail = DATA.travaux[id];
    //     travail.id = id;
    //     travaux.push(travail);
    // }

    if (ouvert !== null) {
        travaux = travaux.filter((travail) => travail.ouvert === ouvert);
    }

    if (cours) {
        travaux = travaux.filter((travail) => travail.cours === cours);
    }

    return travaux;
}

export function trouverTravail(id) {
     if (!Object.hasOwn(DATA.travaux, id)) {
        return null;
    }

    const travail = DATA.travaux[id];

    return { id, ...travail };
}
