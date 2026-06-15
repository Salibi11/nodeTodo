import "dotenv/config";
import { app } from "./app.js";
import mongoose from "mongoose"

console.log(process.env.DB_URL);



export async function start(){
 mongoose.connect(process.env.DB_URL)
.then(()=>{console.log("connection passed")

app.listen(process.env.PORT,()=>console.log(`listening on ${process.env.PORT}`))


})
.catch((err)=>console.log(err))

}
