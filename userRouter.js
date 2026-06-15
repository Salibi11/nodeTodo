import { decider,createUser, login , logout, refresh} from "./models/User.js"

import express from "express"

export const userRouter=express.Router()

userRouter.post("/register",createUser)

userRouter.post("/login",login)

userRouter.post("/logout",decider,logout)

userRouter.post("/refreshToken",refresh)