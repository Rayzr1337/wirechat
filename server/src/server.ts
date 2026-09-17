import { createApp } from "./app";
import  { createServer } from "node:http";
import dotenv from "dotenv";

dotenv.config();

const app = createApp();
const server = createServer(app);

export { server };
