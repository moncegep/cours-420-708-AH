/**
 * Verifie que la valeur est un nombre entier strictement positif
 * @param {number} valeur 
 * @returns 
 */
export function estEntierPositif(valeur) {
    if (!Number.isInteger(valeur)){
        return false;
    }

    return valeur > 0;
}