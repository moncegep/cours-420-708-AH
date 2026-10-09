import { Router } from "express";
import { login } from "../authService.js";


const authRouter = Router();

authRouter.post("/login", (req, res) => {
    const { nomUtilisateur, motDePasse } = req.body;

    const token = login(nomUtilisateur, motDePasse);

    if (token === null) {
        res.status(400).json({ message: "Nom d'utilisateur ou mot de passe erroné" })
        return;
    }

    res.json(token);
});

export default authRouter;