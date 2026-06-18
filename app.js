import express from "express"

import cookieParser from "cookie-parser"

import { start } from "./start.js"

import { router } from "./todoRouter.js"

import { userRouter } from "./userRouter.js"

export const app=express()

app.use(express.json())

app.use(cookieParser())

app.use("/todos",router)

app.use("/users",userRouter)

start()