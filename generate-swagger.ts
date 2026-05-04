import { swaggerSpec } from "./src/config/swagger";
import fs from "fs";

fs.writeFileSync("swagger-output.json", JSON.stringify(swaggerSpec, null, 2));
console.log("Swagger JSON generated successfully!");
