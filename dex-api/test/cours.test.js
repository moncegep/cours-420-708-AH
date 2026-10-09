import { describe, it, expect, vi, assert } from "vitest";

import { verifierCle } from "./../index";

describe("valider le middleware verifierCle", () => {
    it("devrait lever une erreur si la clé d'API est absente ", () => {
        // ARRANGE
        const req = { headers: { "x-api-key": null } };

        const res = {};
        res.status = vi.fn(() => res);
        res.json = vi.fn(() => res);
        
        const next = vi.fn()

        // ACT
        verifierCle(req, res, next);


        // ASSERT
        expect(res.status).to.have.toHaveBeenCalled();
        expect(res.status).to.have.toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            erreur: "clé manquante",
        });
        expect(next).not.toHaveBeenCalled();
    })
})