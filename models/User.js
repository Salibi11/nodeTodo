import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import "dotenv/config"

const userSchema=mongoose.Schema({
    name:String  ,
    gmail:String,
    password:{type:String , required:true},
    todoCounts:{type:Number,default:0},
    rT:String
},{optimisticConcurrency:true})

export const User=mongoose.model("User",userSchema)



//////////////////////////////////////////////////////////////////////
export async function createUser(req,res){
try{

const {name,gmail,password}=req.body
if(!name||!gmail||!password) return res.status(400).send(`all feilds are required`);

if(!gmail.endsWith("@gmail.com")) return res.status(400).send("please enter a valid gmail address")

const existedGmail= await User.findOne({gmail:gmail})

if(existedGmail) return res.status(400).send('OPS , gamil address is used')
//OR
/*
const gmailRegex = /@gmail\.com$/;

if (!gmailRegex.test(gmail)) {
    return res.status(400).send("please enter a valid gmail address");
}
*/

const salt=await bcrypt.genSalt(10)
const hashedPassword=await bcrypt.hash(password,salt)
const newUser=new User({name:name,gmail:gmail,password:hashedPassword})
await newUser.save()
res.send(`Welcome ${name} in todo db`)
}
catch(error){
return res.status(500).send(error.message)
}
}

//////////////////////////////////////////////////////////////////////////////
export const login=async (req,res)=>{
    try{
const {gmail,password}=req.body;
if(!gmail||!password) return res.status(400).send(`name and password are required`);

const dbuser=await User.findOne({gmail:gmail})
if(!dbuser) return res.status(400).send("no user found")

const verifiedPassword=await bcrypt.compare(password,dbuser.password)
if(!verifiedPassword) return res.status(400).send(`infomation invalid`)

return giveToken(dbuser,res)


}
catch(error)
{return res.status(500).send(error.message);}
}




//////////////////////////////////////////////////////////////////////////
export async function giveToken(dbUser,res){
  try {
    const Rtoken = jwt.sign(
      { id: dbUser._id, name: dbUser.name },
      process.env.refreshKey,
      { expiresIn: "7m" },
    );
    dbUser.rT = Rtoken;
    await dbUser.save();

    const load = { id: dbUser._id, name: dbUser.name, rT: dbUser.rT };
    const token =  jwt.sign(load, process.env.accessKey, {
      expiresIn: "1m",
    });



    res.cookie("accessToken", token, {
        sameSite: "lax",
        httpOnly: true,                     // منع الجافا سكريبت من سرقته
        secure: process.env.NODE_ENV === "production", // تشفير الكوكيز عبر HTTPS فقط في الموقع الحقيقي
        maxAge: 1 * 60 * 1000              // مدة الصلاحية بالملي ثانية (15 دقيقة)
    });

    res.cookie("refreshToken", Rtoken, {
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 60 * 1000     // مدة الصلاحية بالملي ثانية (7 أيام)
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
        // مسح الكوكيز من متصفح المستخدم عند خروجه
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        
        return res.send(`logged out successfully,${currentUser.name}`)


    } catch (error) {
       return res.status(500).send(error.message);
    }
    
}




///////////////////////////////////////////////////////////////////////////////////////////
export async function decider(req,res,next) 
{

    try {
    const token = req.cookies?.accessToken;
    if (!token) return res.status(401).send("please first login");

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
    
    return res.status(500).send(`Internal Server Error ${error.message}`);
}

}







//////////////////////////////////////////////////////////////////////////////////////
export const refresh = async (req, res) => {
    try {
        const rT = req.cookies?.refreshToken;
        if (!rT) return res.status(401).send("Refresh Token is missing");
        // 1. فك التوكن (بدون await)
        const decode = jwt.verify(rT, process.env.refreshKey);
       
        // 2. جلب المستخدم أولاً للتأكد من التوكن القديم
        const currentUser = await User.findById(decode.id);
        if (!currentUser) return res.status(401).send("User not found");

        // حزام الأمان: التأكد أن التوكن المرسل هو نفسه المخزن في القاعدة ولم يتم إبطاله
        if (currentUser.rT !== rT) {
            return res.status(403).send("Invalid Refresh Token. Please login again.");
        }

        // 3. توليد التوكنات الجديدة (بدون await)
        const newRefToken = jwt.sign({ id: decode.id, name: decode.name }, process.env.refreshKey, { expiresIn: '7m' });
        
        // 4. تحديث التوكن الجديد في القاعدة
        currentUser.rT = newRefToken;
        await currentUser.save();
        
        const newAccToken = jwt.sign({ id: decode.id, name: decode.name, rT: newRefToken }, process.env.accessKey, { expiresIn: '1m' });
        
        res.cookie("accessToken", newAccToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 1 * 60 * 1000 });
        res.cookie("refreshToken", newRefToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 7 * 60 * 1000 });



        return res.json({message: "Refreshing done"})


    } catch (error) {
        // إذا فشل فك التوكن بسبب انتهائه أو تلفه، نرسل 401 بدلاً من 500
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            return res.status(401).send(`Token error: ${error.message}`);
        }
        return res.status(500).send(error.message);
    }
};
