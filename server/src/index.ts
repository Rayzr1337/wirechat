import { server } from "./server";
import "./ws/server"; 

const PORT = process.env.PORT || 3000;

async function main() {

    server.on("error", (err) => {
        console.error("Failed to start server:", err);
        process.exit(1);
    });

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});