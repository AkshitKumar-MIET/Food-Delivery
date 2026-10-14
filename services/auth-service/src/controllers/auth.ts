
import User from "../model/User.js"
import jwt from "jsonwebtoken"
import TryCatch from "../middlewares/try-catch.js"
import { AuthenticatedRequest } from "../middlewares/isAuth.js"
import { oauth2Cient } from "../config/googleConfig.js"
import axios from "axios"

export const loginUser = TryCatch(async (req, res) => {
    const { code } = req.body

    if(!code){
        return res.status(400).json({
            message: "Authorixation code is required"
        })
    }

    const googleRes = await oauth2Cient.getToken(code)

    oauth2Cient.setCredentials(googleRes.tokens)

    const userRes = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`)

    const {email, name, picture} = userRes.data

        let user = await User.findOne({email})

        if(!user){
            user = await User.create({
                name,
                email,
                image: picture
            })
        }

        const token = jwt.sign({user}, process.env.JWT_SECRET as string, {
            expiresIn: "15d"
        })

        res.status(200).json({
            message: "Logged successful",
            token,
            user
        })
})

const allowedRoles = ["customer", "rider", "seller"] as const

type Role = (typeof allowedRoles)[number]

export const addUserRole = TryCatch(async (req: AuthenticatedRequest, res) => {
    if(!req.user?._id){
        return res.status(401).json({
            message: "Unauthorized"
        })
    }

    const { role} = req.body as { role: Role}

    if(!allowedRoles.includes(role)){
        return res.status(400).json({
            message: "Invalid role"
        })
    }

    const user = await User.findByIdAndUpdate(req.user._id, {role}, {new: true})

    if(!user){
        return res.status(404).json({
            message: "user not found"
        })
    }

    const token = jwt.sign({user}, process.env.JWT_SECRET as string, {
            expiresIn: "15d"
    })

    res.json({
        user,
        token
    })
})

export const myProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
    const user = req.user
    res.json(user)
})