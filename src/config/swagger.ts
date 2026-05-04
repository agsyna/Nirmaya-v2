import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Nirmaya Clinic API",
    version: "1.0.0",
    description: "Clinic management backend API",
  },
  servers: [
    {
      url: "/api",
      description: "API base",
    },
  ],
};

export const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: ["src/routes/*.ts", "src/controllers/*.ts"],
});
