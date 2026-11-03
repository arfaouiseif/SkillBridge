import  jwt  from "jsonwebtoken";

export function signToken(userId: number): string{
    const secret = process.env.JWT_SECRET;
    if (!secret){
        throw new Error('JWT_SECRET is not set');
    }
    return jwt.sign({ sub: String(userId)}, secret, { expiresIn: '7d'});

}
export function verifyToken(token: string): number{
    const secret = process.env.JWT_SECRET;
    if (!secret){
        throw new Error ("JWT_SECRET is not set");

    }
    const payload = jwt.verify(token,secret);
    if (typeof payload === 'string' || !payload.sub){
        throw new Error ("  Invalid token payload");

    }
    return Number(payload.sub);
}
