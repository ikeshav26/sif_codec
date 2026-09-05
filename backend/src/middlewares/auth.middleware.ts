import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
    userId: string;
}

export const userAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let token = req.cookies?.token || (req.headers['authorization'] as string);

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        if (token.startsWith('Bearer ')) {
            token = token.slice(7).trim();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
        req.userId = decoded.id;
        next()
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" })
    }
}