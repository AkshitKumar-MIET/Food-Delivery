import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import Restaurant from "../models/restaurant.js"
import { IMenuItem } from "../models/Menuitems.js";
import { IRestaurant } from "../models/restaurant.js";
import Order from "../models/Order.js";
import axios from "axios";
import { publishEvent } from "../config/order.publlisher.js";

export const createOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
    const user = req.user

    if(!user){
        return res.status(401).json({
            message: "unauthorized"
        })
    }

    const {paymentMethod, addressId} = req.body


    if(!addressId){
        return res.status(400).json({
            message: "Address is required"
        })
    }

    const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371
    const dLat = ((lat2-lat1)*Math.PI)/100
    const dLon = ((lon2-lon1)*Math.PI)/100

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos((lat1 * Math.PI)/180)*Math.cos((lat2*Math.PI)/180)
    * Math.sin(dLon/2)* Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return +((R * c).toFixed(2)) 
  }

  

    const address = await Address.findOne({
        _id: addressId,
        userId: user._id
    })

    if(!address){
        return res.status(404).json({
            message: "address not found"
        })
    }

    const cartItems = await Cart.find({userId: user._id}).populate<{itemId: IMenuItem}>("itemId").populate<{restaurantId: IRestaurant}>("restaurantId")

    if(cartItems.length === 0){
        return res.status(400).json({
            message: "Cart is Empty"
        })
    }

    const firstCartItem = cartItems[0]

    if(!firstCartItem || !firstCartItem.restaurantId){
        return res.status(400).json({
            message: "Invalid Cart Data"
        })
    }

    const restaurantId = firstCartItem.restaurantId._id

    const restaurant = await Restaurant.findById(restaurantId)

    if(!restaurant){
        return res.status(404).json({
            message: "No restaurant with this id"
        })
    }

    if(!restaurant.isOpen){
        return res.status(404).json({
            message: "sorry this restaurant is closed"
        })
    }

    const distance = getDistanceKm(address.location.coordinates[1], address.location.coordinates[0],
                restaurant.autoLocation.coordinates[1], restaurant.autoLocation.coordinates[0]
              )

    let subTotal = 0

    const orderItems = cartItems.map((cart) => {
        const item = cart.itemId

        if(!item){
            throw new Error("Invalid Cart Item")
        }

        const itemTotal = item.price * cart.quantity

        subTotal += itemTotal

        return {
            itemId: item._id.toString(),
            name: item.name,
            price: item.price,
            quantity: cart.quantity
        }
    })

    const deliveryFee = subTotal < 250 ? 40 : 0
    const platformFee = 7
    const totalAmount = subTotal + deliveryFee + platformFee

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    const [longitude, latitude] = address.location.coordinates

    const riderAmount = Math.ceil(distance * 17)

    const order = await Order.create({
        userId: user._id.toString(),
        restaurantId: restaurantId.toString(),
        restaurantName: restaurant.name,
        riderId: null,
        riderAmount,
        items: orderItems,
        subTotal,
        distance,
        deliveryFee,
        platformFee,
        totalAmount,
        addressId: address._id.toString(),
        deliveryAddress: {
            formattedAddress: address.formattedAddress,
            mobile: address.mobile,
            latitude,
            longitude
        },
        paymentMethod,
        paymentStatus: "pending",
        status: "placed",
        expiresAt
    })

    await Cart.deleteMany({userId: user._id})

    res.json({
        message: "Order created successfully",
        orderId: order._id.toString(),
        amount: totalAmount
    })
})

export const fetchOrderForPayment = TryCatch(async (req, res) => {
    if(req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY){
        return res.status(403).json({
            message: "forbidden"
        })
    }

    const order = await Order.findById(req.params.id)

    if(!order){
        return res.status(404).json({
            message: "Order not found"
        })
    }

    if(order.paymentStatus !== "pending"){
        return res.status(400).json({
            message: "Order already paid"
        })
    }

    res.json({
        orderId: order._id,
        amount: order.totalAmount,
        currency: "INR"
    })
})

export const fetchRestaurantOrders = TryCatch(async (req: AuthenticatedRequest, res) => {
    const user = req.user
    const {restaurantId} = req.params

    if(!user){
        return res.status(401).json({
            message: "Unauthorized"
        })
    }

    if(!restaurantId){
        return res.status(400).json({
            message: "restaurantId is required"
        })
    }

    const limit = req.query.limit ? Number(req.query.limit) : 0

    const orders = await Order.find({restaurantId, paymentStatus: "paid"}).sort(
        {createdAt: -1}
    ).limit(limit)

    return res.json({
        success: true,
        count: orders.length,
        orders
    })
})

const ALLOWED_STATUSES = ["accepted", "preparing", "ready_for_rider"] as const

export const updateOrderStatus = TryCatch(async (req: AuthenticatedRequest, res) => {
    const user = req.user
    const {orderId} = req.params
    const {status} = req.body

    if(!user){
        return res.status(401).json({
            message: "Unauthorized"
        })
    }

    if(!ALLOWED_STATUSES.includes(status)){
        return res.status(400).json({message: "Invalid order status"})
    }

    const order = await Order.findById(orderId)

    if(!order){
        return res.status(404).json({
            message: "order not found"
        })
    }

    if(order.paymentStatus !== "paid"){
        return res.status(404).json({
            message: "order not completed"
        })
    }

    const restaurant = await Restaurant.findById(order.restaurantId)

    if(!restaurant){
        return res.status(404).json({
            message: "restaurant not found"
        })
    }

    if(restaurant.ownerId !== user._id.toString()){
        return res.status(400).json({
            message: "Not owner of restaurant - not allowed to update order"
        })
    }

    order.status = status

    await order.save()

    await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,{
        event: "order:update",
        room: `user:${order.userId}`,
        payload: {
            orderId: order._id,
            status: order.status
        }
    }, {
        headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY
        }
    })

    if(status === "ready_for_rider"){
        console.log("Publishing Order ready for rider event for order ", order._id)
    
        await publishEvent("ORDER_READY_FOR_RIDER", {
        orderId: order._id.toString(),
        restaurantId: restaurant._id.toString(),
        location: restaurant.autoLocation
        })
    }
    console.log("Event Published Sucessfully")
    

    res.json({
        message: "order status updated successfully",
        order
    })
})

export const getMyOrders = TryCatch(async (req: AuthenticatedRequest, res) => {
    if(!req.user){
        return res.status(401).json({
            message: "Unauthorized"
        })
    }

    const orders = await Order.find({
        userId: req.user._id.toString(),
        paymentStatus: "paid"
    }).sort({createdAt: -1})

    res.json({orders})
})

export const fetchSingleOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
    if(!req.user){
        return res.status(401).json({
            message: "Unauthorized"
        })
    }

    const order = await Order.findById(req.params.id)

    if(!order){
        return res.status(404).json({
            message: "order not found"
        })
    }

    if(order.userId !== req.user._id.toString()){
        return res.status(401).json({
            message: "You arent allowed to view this order"
        })
    }

    res.json(order)
})

export const assignRiderToOrder = TryCatch(async (req, res) => {
    if(req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY){
        return res.status(403).json({
            message: "forbidden"
        })
    }

    const {orderId, riderId, riderName, riderPhone} = req.body

    const orderAvailable = await Order.findOne({
        riderId,
        status: {
            $ne: "delivered"
        }
    })

    if(orderAvailable){
        return res.status(400).json({
            message: "you already have an order"
        })
    }

    const order = await Order.findById(orderId)

    if(order?.riderId !== null){
        return res.status(400).json({
            message: "Order already taken"
        })
    }

    const orderUpdated = await Order.findOneAndUpdate({
        _id: orderId,
        riderId: null
    },{
        riderId,
        riderName,
        riderPhone,
        status: "rider_assigned"
    },{
        new: true
    })

    await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,{
        event: "order:rider_assigned",
        room: `user:${order.userId}`,
        payload: order
    }, {
        headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY
        }
    })

    await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,{
        event: "order:rider_assigned",
        room: `restaurant:${order.restaurantId}`,
        payload: order
    }, {
        headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY
        }
    })

    res.json({
        message: "Rider assigned successfully",
        success: true,
        order: orderUpdated
    })
})

export const getCurrentOrderForRider = TryCatch(async (req, res) => {
    if(req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY){
        return res.status(403).json({
            message: "forbidden"
        })
    }

    const {riderId}  = req.query

    if(!riderId){
        return res.status(400).json({
            message: "Rider id is required"
        })
    }

    // CAN HAVE ERROR IN BELOW riderId

    const order = await Order.findOne({
        riderId: riderId.toString(),
        status: {$ne: "delivered"},
    }).populate("restaurantId")

    if(!order){
        return res.status(404).json({
            message: "Order not found"
        })
    }

    res.json(order)
})

export const updateOrderStatusRider = TryCatch(async (req, res) => {
    if(req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY){
        return res.status(403).json({
            message: "forbidden"
        })
    }

    const orderId = req.body

    const order = await Order.findById(orderId)

    if(!order){
        return res.status(404).json({
            message: "Order not found"
        })
    }

    if(order.status === "rider_assigned"){
        order.status = "picked_up"

        await order.save()

            await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,{
            event: "order:rider_assigned",
            room: `restaurant:${order.restaurantId}`,
            payload: order
            }, {
            headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY
                }
            })

        await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,{
            event: "order:rider_assigned",
            room: `user:${order.userId}`,
            payload: order
        }, {
            headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY
            }
        })

        return res.json({
            message: "order updated successfully"
        })
    } else if(order.status === "picked_up"){
        order.status = "delivered"

        await order.save()

            await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,{
            event: "order:rider_assigned",
            room: `restaurant:${order.restaurantId}`,
            payload: order
            }, {
            headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY
                }
            })

        await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,{
            event: "order:rider_assigned",
            room: `user:${order.userId}`,
            payload: order
        }, {
            headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY
            }
        })

        return res.json({
            message: "order updated successfully"
        })
    }
})