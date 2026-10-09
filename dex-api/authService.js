import { generateToken } from "./utils.js";

const users = [
    { username: "lelafontant", password: "12345", role: "enseignant" },
    { username: "bob89", password: "loki75", role: "etudiant" },
    { username: "monika", password: "monika01", role: "etudiant" },
]

export function login(uname, pass) {
    const userIndex = users.findIndex((user) => {
        return user.username === uname && user.password === pass;
    });

    if (userIndex === -1) {
        return null;
    }

    const token = generateToken()
    users[userIndex].token = token

    console.log(users);

    return token;
}

export function getUtilisateur(token) {
    return users.find(user => user.token === token);
}