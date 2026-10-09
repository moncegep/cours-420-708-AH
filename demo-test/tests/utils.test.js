import { describe, it, expect } from "vitest";
import { estEntierPositif } from "../index"

describe("estEntierPositif", ()=> {
    it("rejete une valeur qui n'est pas un nombre", ()=> {
        const valeurs = ["bateau", true, 12.4];

        valeurs.forEach(valeur => {
            const resultat = estEntierPositif(valeur);
            
            expect(resultat).to.be.false;
        });

    });

    it("rejete une valeur entière négative", ()=> {
        const valeurs = [-1000, -23.5, -1, -0.1]
        valeurs.forEach(valeur => {
            const resultat = estEntierPositif(valeur);
    
            expect(resultat).to.be.false; 
        });
    });

    it("rejete une valeur nulle", ()=> {
        const valeur = 0
        const resultat = estEntierPositif(valeur);

        expect(resultat).to.be.false;
    })
})