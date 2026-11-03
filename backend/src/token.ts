import  jwt  from "jsonwebtoken";

export function signToken(userId: number): string{
    const secret = process.env.JWT_SECRET;
    if (!secret){
        throw new Error('JWT_SECRET is not set');
    }
    return jwt.sign({ sub: String(userId)}, secret, { expiresIn: '7d'});

}

