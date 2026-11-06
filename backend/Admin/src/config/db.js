const mongoose =require("mongoose")


async function connectDB(){
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Database connected successfully");
    }
    catch(error){
        console.log("Error connecting to database",error.message);
        process.exit(1);
    }
}

module.exports=connectDB;