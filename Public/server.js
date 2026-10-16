const express = require("express");
const app = express();

// Public contiene la página, sus recursos y el archivo local con los datos.
app.use(express.static(__dirname));

// PORT permite cambiar el puerto sin modificar el código del servidor.
const port = process.env.PORT || 3001;

// Inicia el servidor local y muestra la dirección para abrir el dashboard.
app.listen(port, () => {
  console.log(`Servidor listo: http://localhost:${port}`);
});
