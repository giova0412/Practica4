import mongoose from "mongoose";
import moment from "moment-timezone";

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  nickname: { type: String, required: true },
  macAddress: { type: String, required: true },
  ip: { type: String, required: true },
  serverIp: { type: String, required: true },
  serverMacAddress: { type: String, required: true },
  createdAt: { 
    type: String, 
    default: () => moment().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss") 
  },
  lastAccessedAt: { 
    type: String, 
    default: () => moment().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss") 
  },
  status: { 
    type: String, 
    enum: ["Activa", "Inactiva", "Finalizada por el Usuario", "Finalizada por Falla de Sistema"], 
    default: "Activa" 
  }
}, { versionKey: false });

export default mongoose.model("Session", sessionSchema);