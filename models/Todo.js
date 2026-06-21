import mongoose from "mongoose"
import { User,decider } from "./User.js"
import jwt from 'jsonwebtoken'
import 'dotenv/config'





const todoSchema=mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,ref:"User"}  ,
    userName:String,
    title:{type:String /*lowercase:true*/, required:true},
    completed :{type:Boolean,default:false},
    deleted : {type:Boolean,default:false}
},{optimisticConcurrency:true})

const Todo=mongoose.model("Todo",todoSchema)



//////////////////////////////////////
export async function addTodo(req, res) {
  try {
 

    const { title } = req.body;

    const newTodo = new Todo({
      userId: req.user.id,
      userName: req.user.name,
      title: title,
    });
    await newTodo.save();

    /*const userData = await User.findById(req.user.id);
    userData.todoCounts = userData.todoCounts + 1;
    await userData.save();*///OR
    const userData=await User.findByIdAndUpdate(req.user.id,{$inc:{todoCounts:1}},{new:true})

    let s = "";
    if (userData.todoCounts == 1) s = "st";
    else if (userData.todoCounts == 2) s = "nd";
    else if (userData.todoCounts == 3) s = "rd";
    else s = "th";

    return res.send(
      `The ${userData.todoCounts}${s} Todo of ${req.user.name} has added Now`,
    );
  } catch (error) {
    return res.status(500).send(error.message);
  }
}
/////////////////////////////////////////



///////////////////////////////////////////
export async function getTodo(req,res) {
try{
     const page=req.query.page || 1

     const limit=req.query.limit || 5

     const search=req.query.search || ''
     

     /*
     //منع البحث بحروف كبيرة
     const hasUpperCase = /[A-Z]/.test(search);
     if (hasUpperCase) return res.status(400).send("Error: Capital letters are not allowed in search. Please use lowercase only.");
        
     */

     function escapeRegex(string) {
        // هذه الدالة تبحث عن كل الرموز الخاصة وتلغي مفعولها البرمجي
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');}

     //clean search word from special letters
     const cleanSearch=escapeRegex(search)




        
     const query={userId:req.user.id,deleted:false,title:{$regex:cleanSearch,$options:"ixm"}}

     const skip=(page-1)*limit
     const totaTodos= await Todo.countDocuments(query)
     const totalPages=Math.ceil(totaTodos/limit)
     
     const todos=await Todo.find(query).skip(skip).limit(limit)//.populate('userId','rT')

  
res.json({
  todos:todos,totaTodos:totaTodos,totalPages:totalPages
})
}

   catch(error){
    res.status(500).send(error.message)
   } 
}




//////////////////////////////////////////
export async function completeTodo(req,res) {
    try {
        
        const {title}=req.body
        
        const wantedTodo=await Todo.findOneAndUpdate({title:title,userId:req.user.id},{completed:true},{new:true})

        if(!wantedTodo) return res.status(400).send(`Todo not found`)

        return res.send(`The Todo ${wantedTodo.title} has completed successfully`)

    } catch (error) {
       return res.status(500).send(error.message);
        
    }
}





//////////////////////////////////////
export async function deleteTodo(req,res) {
    try {
        
        const {title}=req.body
        
        
        
        const wantedTodo=await Todo.findOne({title:title,userId:req.user.id})
        if(!wantedTodo) return res.status(400).send(`Todo not found`)
        //await Todo.deleteOne(wantedTodo) OR
        await Todo.findByIdAndUpdate(wantedTodo._id,{deleted:true})
        /*currentUser.todoCounts = currentUser.todoCounts - 1
        await currentUser.save()*/
        //OR
        await User.findByIdAndUpdate(req.user.id,{$inc:{todoCounts:-1}})

        return res.send(`The Todo ${wantedTodo.title} has deleted successfully,${req.user.name}`)

    } catch (error) {
        
          return res.status(500).send(error.message);
    }}


    ////////////////////////////////////////////////////////////////////////////
export async function deleteTodoPermanently(req,res) {
    try {
        
        const {title}=req.body
        
        const wantedTodo=await Todo.findOne({title:title,userId:req.user.id})
        if(!wantedTodo) return res.status(400).send(`Todo not found`)
        //await Todo.deleteOne(wantedTodo) OR
        await Todo.findByIdAndDelete(wantedTodo._id)
        if(wantedTodo.deleted==false) await User.findByIdAndUpdate(req.user.id,{$inc:{todoCounts:-1}})
        
        
        return res.send(`The Todo ${wantedTodo.title} has deleted permanently successfully`)

    } catch (error) {
        
          return res.status(500).send(error.message);
    }}