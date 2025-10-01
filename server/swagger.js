const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kartarkiv API',
      version: '1.0.0',
      description: 'Automatisk generert dokumentasjon fra Express API',
    },
  },
  apis: [
    './routes/*.js', // Alle router-filer
    './index.js'     // Hovedserver-filen
  ],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
