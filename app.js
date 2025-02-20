import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import moment from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import os from "os";
import Session from "./model.js";
 import './index.js'; 




// Objeto en memoria para almacenar las sesiones
const sessionsInMemory = {};

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "P4-GRPC#TobiasPerro-SesionesHTTP-VariablesDeSesion",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 60 * 60 * 1000 },
  })
);

const TIMEZONE = "America/Mexico_City";

const getCurrentTime = () => {
  return moment().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss");
};


const getClientIp = (req) => {
  const ip = req.headers["x-forwarded-for"] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress || 
             req.connection.socket?.remoteAddress;

  if (ip === "::1" || ip === "127.0.0.1") {
    return "127.16.0.51";
  }
  if (ip.startsWith("::ffff:")) {
    return ip.split(":").pop();
  }
  return ip;
};


const getLocalIp = () => {
  const networkInterfaces = os.networkInterfaces();

  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        // Si detecta que estás en red local, forzar la IP
        if (iface.address.startsWith("172.") || iface.address === "192.168.0.1") {
          return "127.16.0.51";
        }
        return iface.address;
      }
    }
  }
  return "127.16.0.51";
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} minuto${minutes !== 1 ? "s" : ""}, ${remainingSeconds} segundo${remainingSeconds !== 1 ? "s" : ""}`;
};

// Bienvenida
app.get("/", (req, res) => {
  return res.status(200).json({
    message: "Bienvenido al api de control de sesiones.",
    author: "Giovany Raul Pazos Cruz",
  });
});

// Login Endpoint;

app.post("/login", async (req, res) => {
  const { email, nickname, macAddress } = req.body;

  if (!email || !nickname || !macAddress) {
    return res.status(400).json({ message: "Falta algún campo." });
  }

  const sessionId = uuidv4();
  const now = getCurrentTime();
  const serverIp = getLocalIp();
  const serverMacAddress = getServerMacAddress();

  const newSession = new Session({
    sessionId,
    email,
    nickname,
    macAddress,
    ip: getClientIp(req),
    serverIp,
    serverMacAddress,
    createdAt: getCurrentTime(),
    lastAccessedAt: getCurrentTime(),
    status: "Activa",
  });

  try {
    await newSession.save(); // Método **save** de la librería **Mongoose**
    res.status(200).json({
      message: "Inicio de sesión exitoso.",
      sessionId,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar la sesión.", error });
  }
});


// Logout Endpoint
app.post("/logout", async (req, res) => {
  const { sessionId } = req.body;

  try {
    const session = await Session.findOneAndUpdate(
      { sessionId },
      { status: "Finalizada por el Usuario", lastAccessedAt: getCurrentTime() },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: "No se ha encontrado una sesión activa." });
    }

    res.status(200).json({
      message: "Logout exitoso.",
      session,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al cerrar sesión.", error });
  }
});


// Actualización de la sesión
app.put("/update", async (req, res) => {
  const { sessionId, status, lastAccessedAt } = req.body;

  try {
    const session = await Session.findOneAndUpdate(
      { sessionId },
      { status, lastAccessedAt: lastAccessedAt || getCurrentTime() },
      { new: true }
    ); // Método **findOneAndUpdate** de la librería **Mongoose**

    if (!session) {
      return res.status(404).json({ message: "No existe la sesión." });
    }

    res.status(200).json({
      message: "Sesión actualizada correctamente.",
      session,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar la sesión.", error });
  }
});



// Estado de la sesión
app.get("/status", async (req, res) => {
  const { sessionId } = req.query;

  try {
    const session = await Session.findOne({ sessionId }); // Método **findOne** de la librería **Mongoose**

    if (!session) {
      return res.status(404).json({ message: "No hay sesión activa." });
    }

    const now = moment.tz(TIMEZONE);
    const sessionDurationInSeconds = now.diff(moment(session.createdAt), "seconds");
    const inactivityTimeInSeconds = now.diff(moment(session.lastAccessedAt), "seconds");

    res.status(200).json({
      message: "Sesión activa.",
      session: {
        ...session._doc,
        sessionDuration: formatTime(sessionDurationInSeconds),
        inactivityTime: formatTime(inactivityTimeInSeconds),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error al recuperar la sesión.", error });
  }
});


// Listar todas las sesiones
app.get("/allSessions", async (req, res) => {
  try {
    const sessions = await Session.find({});  // Recuperar todas las sesiones de MongoDB
    res.status(200).json({ sessions });
  } catch (error) {
    res.status(500).json({ message: "Error al recuperar las sesiones.", error });
  }
});


// Función para obtener la MAC Address del servidor
const getServerMacAddress = () => {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.mac; // Retorna la dirección MAC de la primera interfaz activa
      }
    }
  }
  return "00:00:00:00:00:00"; // Valor predeterminado si no se encuentra una dirección MAC
};

// Destrucción automática de sesiones inactivas
setInterval(() => {
  const now = moment();
  for (const sessionId in sessionsInMemory) {
    const session = sessionsInMemory[sessionId];
    const lastAccessedAt = moment(session.lastAccessedAt);
    const inactivityDuration = now.diff(lastAccessedAt, "seconds");

    if (inactivityDuration > 600 && session.status === "Activa") {
      sessionsInMemory[sessionId].status = "Finalizada";
    }
  }
}, 60 * 1000);

app.get("/allCurrentSessions", async (req, res) => {
  try {
    const sessions = await Session.find({ status: "Activa" }); // Método **find** de la librería **Mongoose**
    res.status(200).json({ sessions });
  } catch (error) {
    res.status(500).json({ message: "Error al recuperar las sesiones activas.", error });
  }
});

app.delete("/deleteAllSessions", async (req, res) => {
  try {
    await Session.deleteMany({}); 
    res.status(200).json({ message: "Todas las sesiones han sido eliminadas." });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar las sesiones.", error });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
export default app;
