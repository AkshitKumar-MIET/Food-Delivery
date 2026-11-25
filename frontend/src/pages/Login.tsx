import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../main";
import toast from "react-hot-toast";
import { useAppData } from "../context/AppContext";
import { BiUpload } from "react-icons/bi";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signUp, setSignUp] = useState(true)
  

  const navigate = useNavigate();

  const { setUser, setIsAuth } = useAppData();

  const formData = new FormData();

  formData.append("name", userName);
  formData.append("email", email);
  formData.append("password", password)

  const resetForm = () => {
    setUserName("");
    setEmail("");
    setImage(null);
    setPassword("")
  };

  const handleSubmit = async () => {
    if (!userName || !email || !password) {
      alert("UserName, email and password is required");
      return;
    }

    if(password.length < 8){
      alert("Please use a password of minimum length of 8")
      return
    }

    try {
      setLoading(true);
      const {data} = await axios.post(`${authService}/api/auth/login`, formData)
      localStorage.setItem("token", data.token);
      resetForm()
      toast.success(data.message);
      setLoading(false);
      setUser(data.user);
      setIsAuth(true);
      navigate("/");
    } catch (error) {
      console.log(error);
      toast.error("Failed to Login User");
      setLoading(false)
    }
  };

  useEffect(() => {
      if(signUp){
        if(image){
          formData.append("picture", image);
        }
      } else {
        formData.delete("picture");
      }
    }, [signUp, image])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-3xl font-bold text-[#E23774]">
          FoodShould
        </h1>

        <p className="text-center text-sm text-gray-500">
          Log in or sign up to continue
        </p>

        <div className="flex justify-evenly hover:cursor">
          <button className="flex w-1/5 items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 
          hover:cursor-pointer text-xs text-red-500" onClick={() => setSignUp(true)}>Sign up</button>
          <button className="flex w-1/5 items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 
          hover:cursor-pointer text-xs text-red-500" onClick={() => setSignUp(false)}>Login</button>
        </div>

        <input
        type="text"
        placeholder="User name"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        />

        <input
        type="email"
        placeholder="Your@email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        />

        <input
        type="password"
        placeholder="Your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        minLength={8}
        />

        {signUp && (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
          <BiUpload className="h-5 w-5 text-red-500" />
            {image ? image.name : "Upload profile image"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
        </label>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 
          hover:cursor-pointer"
        >
          {loading ? "Submitting ..." : "Submit"}
        </button>

        <button
          onClick={resetForm}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-red-500
          hover:cursor-pointer"
        >
          Reset Form
        </button>

        <p className="text-center text-xs text-gray-400">
          By continuing, you agree with our{" "}
          <span className="text-[#E23774]">Terms of Service</span> &{" "}
          <span className="text-[#E23774]">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
