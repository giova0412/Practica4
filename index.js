import mongoose from "mongoose";
import app from './app.js';  // Importar el archivo app.js donde están las rutas

const mongoGio = 'mongodb+srv://230314Giovany:Fabuloso1*3@cluster0g.panx4.mongodb.net/API_AWOS4_0-230314?retryWrites=true&w=majority&appName=Cluster0G'

mongoose.connect(mongoGio)
    .then(() => {
        console.log('Conectado a MongoDB Atlas');
        // Aquí termina la conexión a la base de datos
    })
    .catch((err) => {
        console.error('Error de conexión:', err);
    });
