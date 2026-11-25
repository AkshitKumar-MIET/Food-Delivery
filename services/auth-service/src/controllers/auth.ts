import User from "../model/User.js";
import jwt from "jsonwebtoken";
import TryCatch from "../middlewares/try-catch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import getBuffer from "../config/datauri.js";
import axios from "axios";

export const loginUser = TryCatch(async (req, res) => {
  
  const { email, name, password } = req.body;

  let user = await User.findOne({ email, name, password });

  if(user){
    const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "15d",
    });

    return res.json({
      message: "Found Registered User",
      token,
      user,
    })
  }

  const existingUser = await User.findOne({email})

  if(existingUser){
    return res.status(404).json({
      message: "Email already Registered"
    })
  }

  const file = req.file;

  if (!file) {
    return res.status(400).json({
      message: "Please give image",
    });
  }

  const fileBuffer = getBuffer(file);

  if (!fileBuffer?.content) {
    return res.status(500).json({
      message: "Failed to create file buffer",
    });
  }

  const { data: uploadResult } = await axios.post(
      `${process.env.UTILS_SERVICE}/api/upload`,
      {
        buffer: fileBuffer.content,
      }
    );

  user = await User.create({
      name,
      email,
      image: uploadResult.url,
      password
    });

  
  const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "15d",
  });

  res.status(200).json({
    message: "Sighup Success",
    token,
    user,
  });
});

const allowedRoles = ["customer", "rider", "seller", "admin"] as const;
type Role = (typeof allowedRoles)[number];

export const addUserRole = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user?._id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { role } = req.body as { role: Role };

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      message: "Invalid role",
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { role },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "15d",
  });

  res.json({ user, token });
});

export const myProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  res.json(user);
});
