const express=require("express");
const axios=require("axios");
const {rateLimiterCandidate}=require("../middleware/ratelimit");
const router=express.Router();


router.post("/candidate",rateLimiterCandidate,async(req,res)=>{
   try {
     const response=await axios.post("http://localhost:3003/candidate",req.body);
    res.json(response.data);
   } catch (error) {
    res.json({error:error.response.data.message});
   }
})



module.exports=router;