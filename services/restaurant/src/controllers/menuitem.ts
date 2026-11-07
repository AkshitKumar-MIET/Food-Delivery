import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/restaurant.js"
import Menuitems from "../models/Menuitems.js";

export const addMenuItem = TryCatch(async (req:AuthenticatedRequest, res) => {
    if(!req.user){
        return res.status(401).json({
            message: "Please Login"
        })
    }

    const restaurant = await Restaurant.findOne({
        ownerId: req.user._id
    })

    if(!restaurant){
        return res.status(404).json({
            message: "No restaurant found"
        })
    }

    const {name, description, price} = req.body

    if(!name || !price){
        return res.status(400).json({
            message: "Name and Price are required"
        })
    }

    const file = req.file
    if(!file){
        return res.status(400).json({
            message: "please give all image"
        })
    }

    const fileBuffer = getBuffer(file)

    if(!fileBuffer){
        return res.status(500).json({
            message: "failed to create file buffer"
        })
    }

    const {data: uploadResult} = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`,{
        buffer: fileBuffer.content
    })

    const item = await Menuitems.create({
        name,
        description,
        price,
        restaurantId: restaurant._id,
        image: uploadResult.url
    })

    res.json({
        message: "Item Added successfully",
        item
    })
})

export const getAllItems = TryCatch(async (req: AuthenticatedRequest, res) => {
    const {id} = req.params
    if(!id){
        return res.status(400).json({
            message: "Id is required"
        })
    }

    const items = await Menuitems.find({restaurantId: id})

    res.json(items)
})

export const deleteMenuItem = TryCatch(async (req: AuthenticatedRequest, res) => {
    if(!req.user){
        return res.status(401).json({
            message: "Please Login"
        })
    }

    const {itemId} = req.params
    if(!itemId){
        return res.status(400).json({
            message: "itemId is required"
        })
    }

    const item = await Menuitems.findById(itemId)

    if(!item){
        return res.status(404).json({
            message: "No item found"
        })
    }

    const restaurant = await Restaurant.findOne({
        _id: item.restaurantId,
        ownerId: req.user._id
    })

    if(!restaurant){
        return res.status(404).json({
            message: "No restaurant found"
        })
    }

    await item.deleteOne()

    res.json({
        message: "Item deleted successfully"
    })
})

export const toogleMenuItemAvailability = TryCatch(async (req: AuthenticatedRequest, res) => {
    if(!req.user){
        return res.status(401).json({
            message: "Please Login"
        })
    }

    const {itemId} = req.params
    if(!itemId){
        return res.status(400).json({
            message: "itemId is required"
        })
    }

    const item = await Menuitems.findById(itemId)

    if(!item){
        return res.status(404).json({
            message: "No item found"
        })
    }

    const restaurant = await Restaurant.findOne({
        _id: item.restaurantId,
        ownerId: req.user._id
    })

    if(!restaurant){
        return res.status(404).json({
            message: "No restaurant found"
        })
    }

    item.isAvailable = !item.isAvailable

    await item.save()

    res.json({
        message: `Item marked as ${item.isAvailable ? "available" : "unavailable"}`,
        item
    })
})