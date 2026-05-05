// ============================================================
// Monitor web en tiempo real para Firebase Realtime Database
// Ruta usada por el ESP32: /asistencias
// Campos que envía tu ESP32:
// id, nombre, ci, correo, celular, hora
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyA_pIQ0lWF2UdxLW4XAgiWtZi6jaOc6kmI",
  databaseURL: "https://bioasist-7965b-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const tabla = document.getElementById("tablaAsistencias");
const estadoConexion = document.getElementById("estadoConexion");
const totalAsistencias = document.getElementById("totalAsistencias");
const ultimaAsistencia = document.getElementById("ultimaAsistencia");
const horaActual = document.getElementById("horaActual");
const btnLimpiar = document.getElementById("btnLimpiar");

let contador = 0;
let primeraFilaBorrada = false;

// Actualiza la hora actual de la computadora cada segundo.
setInterval(() => {
  const ahora = new Date();
  horaActual.textContent = ahora.toLocaleTimeString("es-BO");
}, 1000);

// Muestra si la página está conectada a Firebase.
firebase.database().ref(".info/connected").on("value", (snapshot) => {
  if (snapshot.val() === true) {
    estadoConexion.textContent = "Conectado";
    estadoConexion.className = "estado conectado";
  } else {
    estadoConexion.textContent = "Sin conexión";
    estadoConexion.className = "estado error";
  }
});

function limpiarTexto(valor) {
  if (valor === undefined || valor === null || valor === "") {
    return "-";
  }
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Convierte la hora en algo legible.
// En tu ESP32 actualmente envías json.set("hora", millis()).
// millis() no es una fecha real, solo cuenta desde que se encendió el ESP32.
// Por eso, si llega millis(), se muestra la hora en que la página recibió el dato.
function obtenerHoraVerificacion(dato) {
  const hora = dato.hora;

  // Si después envías una fecha real tipo UNIX en milisegundos, se mostrará correctamente.
  if (hora && Number(hora) > 1000000000000) {
    return new Date(Number(hora)).toLocaleString("es-BO");
  }

  // Si envías una fecha en texto desde el ESP32, también se muestra.
  if (typeof hora === "string" && hora.trim() !== "") {
    return hora;
  }

  // Si solo llega millis(), usamos la hora real de la computadora/página web.
  return new Date().toLocaleString("es-BO");
}

function obtenerDatosExtra(dato) {
  const camposPrincipales = ["id", "nombre", "ci", "carnet", "correo", "celular", "telefono", "hora"];
  let extras = [];

  for (let campo in dato) {
    if (!camposPrincipales.includes(campo)) {
      extras.push(`<div><b>${limpiarTexto(campo)}:</b> ${limpiarTexto(dato[campo])}</div>`);
    }
  }

  if (extras.length === 0) {
    return "-";
  }

  return extras.join("");
}

function limpiarMensajeInicial() {
  if (!primeraFilaBorrada) {
    tabla.innerHTML = "";
    primeraFilaBorrada = true;
  }
}

function agregarFila(dato, claveFirebase) {
  limpiarMensajeInicial();

  contador++;

  const fila = document.createElement("tr");
  fila.classList.add("nuevo");

  const hora = obtenerHoraVerificacion(dato);

  // Acepta ci o carnet, por si después cambias el nombre del campo en el ESP32.
  const carnet = dato.ci || dato.carnet || "";

  // Acepta celular o telefono, porque en tu estructura del ESP32 usas telefono,
  // pero al enviar a Firebase usas el campo celular.
  const celular = dato.celular || dato.telefono || "";

  fila.innerHTML = `
    <td>${contador}</td>
    <td>${limpiarTexto(dato.id)}</td>
    <td>${limpiarTexto(dato.nombre)}</td>
    <td>${limpiarTexto(carnet)}</td>
    <td>${limpiarTexto(dato.correo)}</td>
    <td>${limpiarTexto(celular)}</td>
    <td>${limpiarTexto(hora)}</td>
    <td class="clave">${limpiarTexto(claveFirebase)}</td>
    <td class="dato-extra">${obtenerDatosExtra(dato)}</td>
  `;

  // Inserta arriba para que el registro más nuevo aparezca primero.
  tabla.prepend(fila);

  totalAsistencias.textContent = contador;
  ultimaAsistencia.textContent = dato.nombre || "Usuario verificado";
}

// Lee en tiempo real cada nuevo registro dentro de /asistencias.
db.ref("asistencias").limitToLast(50).on("child_added", (snapshot) => {
  const dato = snapshot.val();
  const claveFirebase = snapshot.key;

  if (dato) {
    agregarFila(dato, claveFirebase);
  }
});

// Este botón solo limpia la tabla en la página.
// No borra nada de Firebase.
btnLimpiar.addEventListener("click", () => {
  contador = 0;
  primeraFilaBorrada = false;
  totalAsistencias.textContent = "0";
  ultimaAsistencia.textContent = "Sin datos";

  tabla.innerHTML = `
    <tr>
      <td colspan="9" class="sin-datos">Vista limpiada. Esperando nuevas verificaciones...</td>
    </tr>
  `;
});
