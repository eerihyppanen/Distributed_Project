import { Request, Response, NextFunction } from "express";
import jwt, {JwtPayload} from "jsonwebtoken";
import dotenv from "dotenv"

dotenv.config()

export const validateToken = (req: Request, res: Response, next: NextFunction) => {
    
    const authHeader = req.headers.authorization
    const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null

    const cookieToken = req.cookies?.token

    const token = cookieToken || bearerToken

    if (token) {
        try {
            const verified: JwtPayload = jwt.verify(token, process.env.SECRET as string) as JwtPayload
            (req as any).user = verified
            next()

        } catch (err) {
            return res.status(401).json({ error: "Invalid token" })
        }
    }else{
        return res.status(401).json({ error: "No token provided" })

    }
}
