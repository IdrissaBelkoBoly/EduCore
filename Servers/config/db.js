import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("La variable MONGO_URI est absente dans le fichier .env");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB connecté : ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Erreur de connexion à MongoDB : ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
