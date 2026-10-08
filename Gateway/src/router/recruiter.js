const express = require("express");
const axios = require("axios");
const { rateLimiterRecruiter } = require("../middleware/ratelimit");
const router = express.Router();


router.post("/recruiter", rateLimiterRecruiter, async (req, res) => {
   try {
     const response=await axios.post("http://localhost:30002/recruiter",req.body);
    res.json(response.data);
   } catch (error) {
    res.json({error:error.response.data.message});
   }
})



module.exports=router;