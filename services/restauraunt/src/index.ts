import express from "express";
import connectDb from "./config/db.js";
import dotenv from "dotenv";

dotenv.config()

const app = express()

const PORT = process.env.PORT || 5001

app.listen(PORT, ()=>{
    console.log(`Restaurant-service is running at port: ${PORT}`)
    connectDb()
})