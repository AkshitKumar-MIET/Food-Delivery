import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import cors from "cors"

dotenv.config()

const app = express()

app.use(express.json())
app.use(cors())

app.listen(process.env.PORT, () => {
    console.log(`rider service is running ${process.env.PORT}`)

    connectDb()
})