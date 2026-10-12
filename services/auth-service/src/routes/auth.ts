import {Router} from "express"
import { addUserRole, loginUser } from "../controllers/auth.js"
import { isAuth } from "../middlewares/isAuth.js"

const router = Router()

router.post("/login", loginUser)
router.put("/add/role", isAuth, addUserRole)

export default router