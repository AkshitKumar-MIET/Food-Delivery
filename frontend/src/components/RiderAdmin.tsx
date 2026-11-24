import axios from "axios";
import toast from "react-hot-toast";
import { adminService } from "../main";

const RiderAdmin = ({rider, onVerify}: {rider: any; onVerify: () => void}) => {
    const verify = async () => {
        try {
            await axios.patch(`${adminService}/api/v1/verify/rider/${rider._id}`,{},{
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            })

            toast.success("Rider Verified")
            onVerify()
        } catch (error) {
            toast.error("Failed to verify Rider")
        }
    }
    
    return (
        <div className="rounded-xl bg-white p-4 shadow space-y-2">
            <img src={rider.picture} className="h-40 w-full object-cover rounded" alt="" />
            <h3>{rider.phoneNumber}</h3>
            <p className="text-sm text-gray-500">Aadhar Number: {rider.aadharNumber}</p>
            <p className="text-sm text-gray-500">DL Number: {rider.drivingLicenceNumber}</p>

            <button className="w-full rounded bg-green-500 py-2 text-white hover:bg-green-600" onClick={verify}>Verify Rider</button>
        </div>
    )
}

export default RiderAdmin