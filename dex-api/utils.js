const validTokens = []

export const generateToken = () => {
    let token = crypto.randomUUID();
    validTokens.push(token);

    return token;
}

export const validateToken = (token) => {
    return validTokens.includes(token);
}