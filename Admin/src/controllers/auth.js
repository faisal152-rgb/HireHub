const { auth, session, otp } = require("../models");
const { sendEmail } = require("../utils/sendEmail");
const jwt=require("jsonwebtoken");
const crypto=require("crypto");


async function register(res, req) {
  try {
    const {name,email,password,role}=req.body;
    if(!name||!email||!password||!role){
      return res.status(400).json({message:"All fields are required"})
    }
    const existUser =await auth.findOne({email})
    if(existUser)
        return res.status(200).json({message:"User Already Exists"})

    const user= await auth.create({
        name,
        email,
        password,
        role,
        isVerified:false,
        isActive:true,
    });
    const otp = generateOtp();
    const html = getOtpHtml(otp);
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    await otpModel.deleteOne({ email });
    const otpData = await otpModel.create({
      email: user.email,
      user: user._id,
      otpHash,
      expiresAt: Date.now() + 10 * 60 * 1000,
    }) 
    console.log("OTP Data",otpData)
    await sendEmail({
      to: user.email,
      subject: `OTP Verification ${otp}`,
      text: `Your OTP is ${otp}`,
      html: html
    })
  return res.status(201).json({
    Message: "Registration Successfull",
    Status: "Success",
    user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
    },
  });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}
async function login (res,req){
    try{
     const {email,password,role} =req.body;
     if(!email || !password || !role){
      return res.status(400).json({message:"All fields are required"})
     }
     const user = await auth.findOne({email})+password
        if(!user){
            return res.status(400).json({message:"User not found"})
        }
     const isPasswordMatch=await user.comparePassword(password);
     if(!isPasswordMatch){
       return res.status(400).json({message:"Invalid Password"})
     }
    if(user.isActive){
    return res.status(200).json({message:"Login Success",
      user:{
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      }
    })}
    if(!user.isVerified){
    const otp = generateOtp();
    const html = getOtpHtml(otpGenerate);
    const otpHash = crypto.createHash("sha256").update(otpGenerate).digest("hex");
    await otpModel.deleteOne({ email });
    const otpData = await otpModel.create({
      email: user.email,
      user: user._id,
      otpHash,
      expiresAt: Date.now() + 10 * 60 * 1000,
    }) 
    console.log("OTP Data",otpData)
    await sendEmail({
      to: user.email,
      subject: `OTP Verification ${otpGenerate}`,
      text: `Your OTP is ${otpGenerate}`,
      html: html
    })
    }
   const refreshToken=jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
   const refreshTokenHash=crypto.createHash("sha256").update(refreshToken).digest("hex");
   await session.create({
    user: user._id,
    refreshTokenHash,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    ip: req.ip,
    userAgent: req.header("user-agent"),
   })
   const accesstoken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });

   res.cookie("refreshToken",refreshToken,{
    httpOnly: true,
    secure: true, // Set to true if using HTTPS
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
   })

   return res.status(200).json({
    message:"Login Success",
    user:{
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    }
  })
}
    catch(error){
        console.log(error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
}
async function logout(res,req){
    try {
        const token = req.cookies.refreshtoken; 
        if(!token){
            return res.status(400).json({message:"No token provided"})
        }
        const refreshTokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const session = await session.findOne({
            refreshTokenHash,
            revoked: false
        });
        if(!session){
            return res.status(400).json({message:"No valid session found"})
        }
         session.revoked = true;
         await session.save();
         res.clearCookie("refreshToken")
        return res.status(200).json({message:"Logout Success",
            user:{
                _id: user._id,
                email: user.email
            }
        })
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
}
async function logoutall(res,req){
  try {
    const userId=req.params.userId;
    if(!userId){
        res.status(400).json({message:"UserId is required"})
    }
     const user = await auth.findOne({_id:userId})
     if(!user){
        return res.status(400).json({message:"User not found"})
     }
     await session.deleteMany({user:userId})
     return res.status(200).json({message:"Logout Success",
      user:{
        _id: user._id,
        email: user.email
      }
    })
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}
async function verifyOtp(res,req){
  try{
    const {email,otp}=req.body;
    if(!email || !otp){
      return res.status(400).json({message:"Email and OTP are required"})
    }
    const user=await auth.findOne({email})
    if(!user){
      return res.status(400).json({message:"User not found"})
    }
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpData = await otp.findOne({
      email,
      otpHash,
      expiresAt: { $gt: Date.now() }
    });
    if (!otpData) {
      return res.status(404).json({
        message: "OTP invalid or expired",
        status: "Failed"
      });
    }
    user.isVerified=true;
    await user.save();
    await otp.deleteOne({ email });
    return res.status(200).json({
      message: "OTP verified successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        verified: user.isVerified
      }
    }); 
  }catch(error){
    console.log("Error in Verify OTP",error.message)
    return res.status(500).json({message:"Internal server error"})
  }
}