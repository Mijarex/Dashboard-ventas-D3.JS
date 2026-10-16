// Registros descargados del JSON y métrica elegida para el eje vertical.
let registros = [];
let metrica = "ventas";

// Catálogos compartidos por las visualizaciones y la escala de colores.
const productos = ["Smartphone A", "Smartphone B", "Tablet X"];
const meses = ["Enero", "Febrero"];
const colores = d3.scaleOrdinal()
  .domain(productos).range(["#2563eb", "#0d9488", "#d97706"]);
// Espera la carga de Google Charts antes de intentar dibujar el gráfico.
google.charts.load("current", { packages: ["corechart"] });
const chartsListos = new Promise(resolve =>
  google.charts.setOnLoadCallback(resolve));
 
// Obtiene los datos sin caché y comprueba la respuesta HTTP y su formato.
async function cargarDatos() {
  const respuesta = await fetch("ventas.json?t=" + Date.now(),
                                { cache: "no-store" });
  if (!respuesta.ok) throw new Error("No se pudo cargar ventas.json");
  const datos = await respuesta.json();
  if (!Array.isArray(datos)) throw new Error("JSON no es una lista");
  return datos;
}
 
// Agrupa los registros por mes y crea el gráfico de columnas de Google Charts.
function dibujarGoogle() {
  const filas = meses.map(mes => [
    mes,
    ...productos.map(producto => {
      const item = registros.find(d =>
        d.mes === mes && d.producto === producto);
      return item ? Number(item.ventas) : 0;
    })
  ]);
  const tabla = google.visualization.arrayToDataTable([
    ["Mes", ...productos], ...filas
  ]);
  const grafico = new google.visualization.ColumnChart(
    document.getElementById("graficoGoogle"));
  grafico.draw(tabla, {
    title: "Ventas por mes y producto",
    legend: { position: "bottom" },
    colors: productos.map(p => colores(p)),
    height: 360,
    chartArea: { width: "80%", height: "65%" },
    vAxis: { title: "Unidades vendidas", minValue: 0 },
    hAxis: { title: "Mes" }
  });
}
 
// Dibuja el gráfico de burbujas; su eje vertical depende de la métrica elegida.
function dibujarD3() {
  // Dimensiones internas del SVG y espacio reservado para los ejes.
  const ancho = 900, alto = 400;
  const margen = { top: 30, right: 25, bottom: 65, left: 80 };
  const x = d3.scalePoint().domain(meses)
    .range([margen.left + 100, ancho - margen.right - 100]);
  const maxY = d3.max(registros, d => Number(d[metrica])) || 1;
  const y = d3.scaleLinear().domain([0, maxY * 1.2])
    .range([alto - margen.bottom, margen.top]);

  // El radio representa ingresos aunque el usuario cambie la métrica del eje Y.
  const radio = d3.scaleSqrt()
    .domain([0, d3.max(registros, d => Number(d.ingresos)) || 1])
    .range([6, 30]);
  const svg = d3.select("#graficoD3").selectAll("svg")
    .data([null]).join("svg")
    .attr("viewBox", `0 0 ${ancho} ${alto}`)
    .style("width", "100%").style("height", "auto");
  svg.selectAll(".ejeX").data([null]).join("g")
    .attr("class", "ejeX")
    .attr("transform", `translate(0,${alto - margen.bottom})`)
    .call(d3.axisBottom(x));
  svg.selectAll(".ejeY").data([null]).join("g")
    .attr("class", "ejeY")
    .attr("transform", `translate(${margen.left},0)`)
    .transition().duration(600).call(d3.axisLeft(y));
  svg.selectAll(".tituloY").data([null]).join("text")
    .attr("class", "tituloY").attr("x", 12).attr("y", 20)
    .text(metrica === "ventas" ? "Ventas (unidades)" : "Ingresos");

  // Reutiliza un único tooltip y separa los productos del mismo mes.
  const tooltip = d3.select("body").selectAll(".tooltip")
    .data([null]).join("div").attr("class", "tooltip");
  const desplazamiento = { "Smartphone A": -45,
    "Smartphone B": 0, "Tablet X": 45 };
  const burbujas = svg.selectAll("circle.burbuja")
    .data(registros, d => `${d.producto}-${d.mes}`);

  // Conserva las burbujas existentes y anima las que entran, cambian o salen.
  burbujas.join(
    enter => enter.append("circle").attr("class", "burbuja")
      .attr("cx", d => x(d.mes) + desplazamiento[d.producto])
      .attr("cy", alto - margen.bottom).attr("r", 0)
      .attr("fill", d => colores(d.producto)).attr("opacity", 0.8),
    update => update,
    exit => exit.transition().duration(400).attr("r", 0).remove()
  ).on("mouseover", function(event, d) {
    // Resalta el punto y presenta los detalles del registro seleccionado.
    d3.select(this).attr("stroke", "#172b43").attr("stroke-width", 2);
    tooltip.style("opacity", 1)
      .html(`<strong>${d.producto}</strong><br>${d.mes}<br>` +
        `Ventas: ${d.ventas}<br>Ingresos: ${d.ingresos}<br>` +
        `Precio: ${d.precio}`);
  }).on("mousemove", function(event) {
    tooltip.style("left", (event.pageX + 12) + "px")
      .style("top", (event.pageY - 25) + "px");
  }).on("mouseout", function() {
    d3.select(this).attr("stroke", null);
    tooltip.style("opacity", 0);
  }).on("click", function(event, d) {
    // Actualiza el mensaje de estado cuando se selecciona una burbuja.
    document.getElementById("estado").textContent =
      `Seleccionado: ${d.producto}, ${d.mes}; ${d.ventas} ventas`;
  }).transition().duration(700)
    .attr("cx", d => x(d.mes) + desplazamiento[d.producto])
    .attr("cy", d => y(Number(d[metrica])))
    .attr("r", d => radio(Number(d.ingresos)))
    .attr("fill", d => colores(d.producto));
}
 
// Coordina la descarga y el redibujado de ambos gráficos y comunica errores.
async function actualizar() {
  const estado = document.getElementById("estado");
  const boton = document.getElementById("actualizar");
  boton.disabled = true;
  estado.textContent = "Actualizando datos…";
  try {
    await chartsListos;
    registros = await cargarDatos();
    dibujarGoogle();
    dibujarD3();
    estado.textContent = `Datos actualizados: ${registros.length} registros`;
  } catch (error) {
    console.error(error);
    estado.textContent = "Error: " + error.message;
  } finally {
    boton.disabled = false;
  }
}
 
// El botón vuelve a consultar los datos y el selector actualiza el eje Y.
document.getElementById("actualizar")
  .addEventListener("click", actualizar);
document.getElementById("metrica")
  .addEventListener("change", event => {
    metrica = event.target.value;
    if (registros.length) dibujarD3();
  });
window.addEventListener("resize", () => {
  // Google Charts necesita redibujarse para adaptarse al nuevo tamaño.
  if (registros.length) dibujarGoogle();
});
actualizar();
