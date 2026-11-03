import { NextFunction , Request, Response} from 'express';
import { verifyToken } from '../token';

export function requireAuth(req: Request, res: Response, next: NextFunction):void {
    const header  = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')){
        res.status(401).json({ message: 'Missing token '});
        return;
    }

    try{
        const token = header.slice('Bearer '.length);
        res.locals.userId = verifyToken(token);
        next();

    } catch {
        res.status(401).json({ message: 'Invalid or expired token'});
    }

}

