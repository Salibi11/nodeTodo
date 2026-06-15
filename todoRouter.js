import express from "express"

import { decider } from "./models/User.js";

import { addTodo , completeTodo, deleteTodo , deleteTodoPermanently, getTodo } from "./models/Todo.js"

export const router=express.Router()

router.use(decider)

router.patch("/completeTodo",completeTodo)

router.post("/addTodo",addTodo)

router.get("/getTodo",getTodo)

router.patch("/deleteTodo",deleteTodo)

router.delete("/deleteTodoPermanently",deleteTodoPermanently)
