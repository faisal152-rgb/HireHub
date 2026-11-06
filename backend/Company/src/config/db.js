const mongoose =require("mongoose")


async function connectDB(){
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Company Database connected successfully");
    }
    catch(error){
        console.log("Error connecting to Company Database",error.message);
        process.exit(1);
    }
}

module.exports=connectDB;