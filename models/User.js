import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import "dotenv/config"

const userSchema=mongoose.Schema({
    name:String  ,
    password:{type:String , required:true},
    todoCounts:{type:Number,default:0},
    rT:String
},{optimisticConcurrency:true})

export const User=mongoose.model("User",userSchema)



//////////////////////////////////////////////////////////////////////
export async function createUser(req,res){
try{

const {name,password}=req.body
if(!name||!password) return res.status(400).send(`name and password are required`);

const salt=await bcrypt.genSalt(10)
const hashedPassword=await bcrypt.hash(password,salt)
const newUser=new User({name:name,password:hashedPassword})
await newUser.save()
res.send(`Welcome ${req.body.name} in todo db`)
}
catch(error){
return res.status(401).send(error.message)
}
}

//////////////////////////////////////////////////////////////////////////////
export const login=async (req,res)=>{
    try{
const {name,password}=req.body;
if(!name||!password) return res.status(400).send(`name and password are required`);

const dbuser=await User.findOne({name:name})
if(!dbuser) return res.send("no user found")
const verifiedPassword=await bcrypt.compare(password,dbuser.password)
if(!verifiedPassword) return res.status(400).send(`infomation invalid`)
return await giveToken(dbuser,res)


}
catch(error)
{console.log(error.message);}
}




//////////////////////////////////////////////////////////////////////////
export async function giveToken(dbUser,res){
  try {
    const Rtoken = await jwt.sign(
      { id: dbUser._id, name: dbUser.name },
      process.env.refreshKey,
      { expiresIn: "7m" },
    );
    dbUser.rT = Rtoken;
    await dbUser.save();

    const load = { id: dbUser._id, name: dbUser.name, rT: dbUser.rT };
    const token = await jwt.sign(load, process.env.accessKey, {
      expiresIn: "1m",
    });

    process.env.rToken = Rtoken;
    process.env.aToken = token;


    res.cookie("accessToken", token, {
        httpOnly: true,                     // منع الجافا سكريبت من سرقته
        secure: process.env.NODE_ENV === "production", // تشفير الكوكيز عبر HTTPS فقط في الموقع الحقيقي
        maxAge: 15 * 60 * 1000              // مدة الصلاحية بالملي ثانية (15 دقيقة)
    });

    res.cookie("refreshToken", Rtoken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000     // مدة الصلاحية بالملي ثانية (7 أيام)
    });

    return res.json({ message: `login success ${dbUser.name}`})
  } catch (error) {
    return res.status(500).send(error.message);
  }
}




///////////////////////////////////////////////////////////////////////////////
export async function logout(req,res) {
    try {


        const currentUser=await User.findByIdAndUpdate(req.user.id,{rT:''},{new:true})
        
        return res.send(`logged out successfully,${currentUser.name}`)


    } catch (error) {
       return res.status(500).send(error.message);
    }
    
}



///////////////////////////////////////////////////////////////////////////////////////////
export async function decider(req,res,next) 
{

    try {
    const auth=req.headers["authorization"]
    const token = auth.split(' ')[1]
    const decode= jwt.verify(token,process.env.accessKey)
    const currentUser=await User.findById(decode.id)
    if (!currentUser) return res.status(401).send("User not found");
    if(currentUser.rT!==decode.rT) return res.status(401).send(`OPS,LOGGED OUT`)
    req.user=decode
    return next()  
     }
    catch (error) {
    // إذا كان الخطأ قادم من مكتبة JWT (التوكن منتهي أو تالف)
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
        return res.status(401).send(`Token error: ${error.message}`);
    }
    
    // أي خطأ آخر غير متوقع (مثل مشكلة في قاعدة البيانات) يكون 500
    console.error("Database or Server Error:", error.message); // لكي تراه أنت في لوحة التحكم
    return res.status(500).send("Internal Server Error");
}

}

//////////////////////////////////////////////////////////////////////////////////////
export const refresh = async (req, res) => {
    try {
        const { rT } = req.body;
        if (!rT) return res.status(401).send("rT is required");
        
        // 1. فك التوكن (بدون await)
        const decode = jwt.verify(rT, process.env.refreshKey);
       
        // 2. جلب المستخدم أولاً للتأكد من التوكن القديم
        const currentUser = await User.findById(decode.id);
        if (!currentUser) return res.status(401).send("User not found");

        // 🔥 حزام الأمان: التأكد أن التوكن المرسل هو نفسه المخزن في القاعدة ولم يتم إبطاله
        if (currentUser.rT !== rT) {
            return res.status(403).send("Invalid Refresh Token. Please login again.");
        }

        // 3. توليد التوكنات الجديدة (بدون await)
        const newRefToken = jwt.sign({ id: decode.id, name: decode.name }, process.env.refreshKey, { expiresIn: '10m' });
        
        // 4. تحديث التوكن الجديد في القاعدة
        currentUser.rT = newRefToken;
        await currentUser.save();
        
        const newAccToken = jwt.sign({ id: decode.id, name: decode.name, rT: newRefToken }, process.env.accessKey, { expiresIn: '1m' });
        
        return res.json({
            message: "Refreshing done", // تم تصحيح الكلمة الإملائية massage إلى message
            newAccToken: newAccToken,
            newRefToken: newRefToken
        });

    } catch (error) {
        // إذا فشل فك التوكن بسبب انتهائه أو تلفه، نرسل 401 بدلاً من 500
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            return res.status(401).send(`Token error: ${error.message}`);
        }
        return res.status(500).send(error.message);
    }
};
