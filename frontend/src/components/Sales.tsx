import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import type { IOrder } from "../types";

const Sales = ({restaurantId}: {restaurantId: string}) => {

    const [loading, setLoading] = useState(true)
    const [orders, setResponse] = useState<IOrder[]>([])
    

    const getSales = async () => {
        try {
            setLoading(true)
            const {data} = await axios.get(`${restaurantService}/api/order/restaurant/${restaurantId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            })

            setResponse(data.orders)
        } catch (error) {
            toast.error("Couldnt fetch sales, Try again Later")
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        getSales()
    }, [restaurantId])

    if(loading){
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <p className="text-gray-500">Loading Restaurant Sales...</p>
            </div>
        ) 
    }

    if(orders.length === 0){
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <p className="text-gray-500">No Sales Yet</p>
            </div>
        )
    }


    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {
                orders.map((order) => {
                    let totalRevenue = 0
                    return <div className="relative flex gap-4 roumded-lg bg-white p-4 shadow-sm">
                        {
                            order.items.map((item) => {
                                totalRevenue += item.price - Math.ceil(item.price * 0.3)
                                return <div className="flex flex-1 flex-col justify-between">
                                    <h3 className="font-semibold">{item.name}</h3>
                                    <p className="font-medium">Selling Price: ₹${item.price}</p>
                                    <p className="font-medium">:Platform Cut: ₹${Math.ceil(item.price * 0.3)}</p>
                                    <p className="font-medium">:Your Revenue: ₹${item.price - Math.ceil(item.price * 0.3)}</p>
                                </div>
                                })
                        }
                        <h2>Total Revenue: ₹${totalRevenue}</h2>
                    </div>
                })
            }
        </div>
    )
}

export default Sales