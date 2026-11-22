import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import cors from "cors"
import riderRoutes from "./routes/rider.js"
import { connectRabbitMq } from "./config/rabbitmq.js"
import { startOrderReadyConsumer } from "./config/orderReady.consumer.js"

dotenv.config()

await connectRabbitMq()
startOrderReadyConsumer()

const app = express()

app.use(express.json())
app.use(cors())

app.use("/api/rider", riderRoutes)

app.listen(process.env.PORT, () => {
    console.log(`rider service is running ${process.env.PORT}`)

    connectDb()
})