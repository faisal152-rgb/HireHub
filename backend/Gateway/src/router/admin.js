const express=require("express");
const axios=require("axios");
const {rateLimiterAdmin}=require("../middleware/ratelimit");
const router=express.Router();


router.post("/admin",rateLimiterAdmin,async(req,res)=>{
   try {
     const response=await axios.post("http://localhost:30001/admin",req.body);
    res.json(response.data);
   } catch (error) {
    res.json({error:error.response.data.message});
   }
})



module.exports=router;
