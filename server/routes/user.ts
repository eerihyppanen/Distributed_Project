import {Router, Request, Response} from "express"
import { IUser, User } from "../models/User"
import { validateToken } from "../middleware/validateToken"
import {nicknameValidator, passwordValidator} from "../middleware/inputValidation"
import bcrypt from "bcrypt"
import jwt, { JwtPayload } from "jsonwebtoken"
import { Result, ValidationError, validationResult } from "express-validator"

//Routes to create and modify users
const router: Router = Router()
export default router


//Route to register a new account. Checks if user exists already and password and nickname are valid.
router.post("/register",  nicknameValidator, passwordValidator, async (req: Request, res: Response) => {
    const errors: Result<ValidationError> = validationResult(req)
    
    if(!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json({error: errors.array()[0]?.msg})
    }
    try{
        const { nickname, password } = req.body
    
        if (!nickname || !password) {
            return res.status(400)
        }

        const existing = await User.findOne({nickname: nickname})
        
        if (existing) {
            return res.status(403).json({error: "this user exists already"})
        }
             
        const hash = await bcrypt.hash(password, 6)

        const newUser = await User.create({
            nickname: nickname,
            password: hash,
        })
        
        return res.status(200).json({ success: true, user: { id: newUser._id, nickname: newUser.nickname } })
    } catch (e) {
        console.error(e)
        res.status(500).send("Internal server error.")
    } 
})

//route to login to an existing account.
router.post("/login", nicknameValidator, passwordValidator, async (req: Request, res: Response) => {
    const errors: Result<ValidationError> = validationResult(req)

    if(!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json({error: errors.array()[0]?.msg})
    }

    const { nickname, password } = req.body
    const user = await User.findOne({nickname: nickname})
    if (!user) {
      return res.status(404).json({ error: "No user found for this nickname" })
    }

    if( await bcrypt.compare(password, user.password)){
        const jwtPayload: JwtPayload = {
            _id : user._id,
            nickname: user.nickname
        }
        const token = jwt.sign(jwtPayload, process.env.SECRET as string, { expiresIn: "1h" })
        
        return res.status(200).json({ success: true, token: token , user: {nickname: user.nickname, id: user._id}})
    }
    return res.status(401).json({ error: "Login failed" })
})

//route to search users by nickname
router.get("/search", validateToken, async (req: Request, res: Response) => {
    try {
        const nicknameQuery = String(req.query.nickname || "").trim()

        if (!nicknameQuery) {
            return res.status(400).json({ error: "nickname query is required" })
        }

        const users = await User.find({
            nickname: { $regex: `^${nicknameQuery}`, $options: "i" }
        })
            .select("_id nickname")
            .limit(10)

        return res.status(200).json({
            success: true,
            users: users.map((user) => ({ id: user._id, nickname: user.nickname }))
        })
    } catch (e) {
        console.error(e)
        res.status(500).send("Internal server error.")
    }
})

//route to get a user by id
router.get("/:id", async (req: Request, res: Response) => {
    try{
        const { id } = (req as any).params
       
        const user = await User.findById(id)
        if(!user){
            return res.status(404).json({ error: "No user found" })
        }

        return res.status(200).json({success: true, user: user})
    } catch (e) {
        console.error(e)
        res.status(500).send("Internal server error.")
    }
})

//route to update accounts information like password.
router.post("/update", validateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ error: "No user found" })
        }

        const { password, nickname } = req.body
        const updateFields: Partial<IUser> = {}

        if (nickname) {
            const existing = await User.findOne({ nickname })
            if (existing && existing._id.toString() !== userId.toString()) {
                return res.status(409).json({ error: "Nickname is already in use" })
            }
            updateFields.nickname = nickname
        }

        if (password) {
            updateFields.password = await bcrypt.hash(password, 6)
        }

        
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ error: "No update data provided" })
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true }
        ).select("-password")

        return res.status(200).json({
            success: true,
            user: updatedUser,
        })
    } catch (e) {
        console.error(e)
        res.status(500).send("Internal server error.")
    }
})
