import axios from "axios";
import type { IOrder } from "../types"
import { riderService } from "../main";

interface Props{
    order: IOrder;
    onStatusUpdate: () => void;
}

const RiderCurrentOrder = ({order, onStatusUpdate}: Props) => {

    const updateStatus = async () => {
        try {
            await axios.post(`${riderService}/api/rider/oder/update/${order._id}`)
        } catch (error) {
            
        }
    }
    return (
        <div></div>
    )
}

export default RiderCurrentOrder