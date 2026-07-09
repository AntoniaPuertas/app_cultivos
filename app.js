/* ============================================================
   ¿Qué siembro? — lógica de la app
   Lee el modelo exportado desde el notebook (variable global
   MODELO, definida en modelo.js) y calcula la probabilidad de
   cada cultivo dada la evidencia que marca el usuario.
   ============================================================ */

// ---------- 1. Textos de la interfaz ----------

const INFO_VARIABLES = {
  N:           { nombre: "Nitrógeno (N)",   unidad: "kg/ha" },
  P:           { nombre: "Fósforo (P)",     unidad: "kg/ha" },
  K:           { nombre: "Potasio (K)",     unidad: "kg/ha" },
  temperature: { nombre: "Temperatura",     unidad: "°C" },
  humidity:    { nombre: "Humedad del aire",unidad: "%" },
  ph:          { nombre: "pH del suelo",    unidad: "escala 0–14" },
  rainfall:    { nombre: "Lluvia anual",    unidad: "mm" },
};

// Nombre en español y emoji para cada cultivo del dataset
const CULTIVOS = {
  rice: "Arroz 🌾", maize: "Maíz 🌽", chickpea: "Garbanzo 🫘",
  kidneybeans: "Alubia roja 🫘", pigeonpeas: "Guandú 🫛",
  mothbeans: "Judía polilla 🫘", mungbean: "Judía mungo 🫛",
  blackgram: "Judía negra 🫘", lentil: "Lenteja 🟤",
  pomegranate: "Granada 🔴", banana: "Plátano 🍌", mango: "Mango 🥭",
  grapes: "Uva 🍇", watermelon: "Sandía 🍉", muskmelon: "Melón 🍈",
  apple: "Manzana 🍎", orange: "Naranja 🍊", papaya: "Papaya 🧡",
  coconut: "Coco 🥥", cotton: "Algodón ☁️", jute: "Yute 🌿",
  coffee: "Café ☕",
};

const NIVELES = ["bajo", "medio", "alto"];
const OBJETIVO = MODELO.objetivo; // "label"

// ---------- 2. Construir el formulario ----------

const contenedor = document.getElementById("lista-variables");

for (const variable of Object.keys(INFO_VARIABLES)) {
  const info = INFO_VARIABLES[variable];
  const [b0, b1, b2, b3] = MODELO.limites[variable]; // cortes de los terciles

  const bloque = document.createElement("div");
  bloque.className = "variable";
  bloque.innerHTML = `
    <div class="variable-cabecera">
      <span class="variable-nombre">${info.nombre}</span>
      <span class="variable-unidad">${info.unidad}</span>
    </div>
    <div class="niveles" role="radiogroup" aria-label="${info.nombre}">
      ${["desconocido", ...NIVELES].map((nivel, i) => `
        <label class="nivel">
          <input type="radio" name="${variable}" value="${nivel}" ${i === 0 ? "checked" : ""}>
          <span>${nivel === "desconocido" ? "No lo sé" : nivel}</span>
        </label>`).join("")}
    </div>
    <p class="rangos">bajo &lt; ${b1.toFixed(1)} · medio ${b1.toFixed(1)}–${b2.toFixed(1)} · alto &gt; ${b2.toFixed(1)}</p>
  `;
  contenedor.appendChild(bloque);
}

// ---------- 3. Inferencia: enumeración de la probabilidad conjunta ----------
//
// P(cultivo | evidencia) ∝ Σ (sobre las variables no observadas) de
// Π P(nodo | padres del nodo). Con 7 variables de 3 niveles y 22
// cultivos hay como mucho 3^7 × 22 ≈ 48 000 combinaciones: el
// navegador las recorre todas en unos pocos milisegundos.

const cpdPorVariable = {};
for (const cpd of MODELO.cpds) cpdPorVariable[cpd.variable] = cpd;

// Probabilidad local P(variable = su valor | valores de sus padres)
function probabilidadLocal(variable, asignacion) {
  const cpd = cpdPorVariable[variable];
  const fila = MODELO.variables[variable].indexOf(asignacion[variable]);
  // La columna se calcula en base mixta: el último padre varía más rápido
  let columna = 0;
  for (const padre of cpd.padres) {
    const estados = cpd.estados_padres[padre];
    columna = columna * estados.length + estados.indexOf(asignacion[padre]);
  }
  return cpd.valores[fila][columna];
}

function inferir(evidencia) {
  const nodos = Object.keys(MODELO.variables);
  const libres = nodos.filter((n) => !(n in evidencia)); // incluye "label"
  const acumulado = {};
  for (const cultivo of MODELO.variables[OBJETIVO]) acumulado[cultivo] = 0;

  // Recorremos todas las combinaciones de las variables libres
  const asignacion = { ...evidencia };
  function recorrer(i) {
    if (i === libres.length) {
      let p = 1;
      for (const nodo of nodos) p *= probabilidadLocal(nodo, asignacion);
      acumulado[asignacion[OBJETIVO]] += p;
      return;
    }
    for (const estado of MODELO.variables[libres[i]]) {
      asignacion[libres[i]] = estado;
      recorrer(i + 1);
    }
  }
  recorrer(0);

  // Normalizamos para que las probabilidades sumen 1
  const total = Object.values(acumulado).reduce((a, b) => a + b, 0);
  for (const k in acumulado) acumulado[k] /= total;
  return acumulado;
}

// ---------- 4. Conectar el formulario con el resultado ----------

const formulario = document.getElementById("formulario");
const zonaResultado = document.getElementById("zona-resultado");

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();

  // Recogemos la evidencia: solo las variables con nivel marcado
  const evidencia = {};
  for (const variable of Object.keys(INFO_VARIABLES)) {
    const valor = formulario.elements[variable].value;
    if (valor !== "desconocido") evidencia[variable] = valor;
  }

  const probabilidades = inferir(evidencia);
  const ranking = Object.entries(probabilidades)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  mostrarResultado(ranking, Object.keys(evidencia).length);
});

document.getElementById("boton-limpiar").addEventListener("click", () => {
  formulario.reset();
  zonaResultado.className = "zona-vacia";
  zonaResultado.innerHTML =
    "<p>Ficha limpia. Marca los niveles que conozcas y vuelve a pedir una recomendación.</p>";
});

function mostrarResultado(ranking, numPistas) {
  zonaResultado.className = "";

  const textoPistas = numPistas === 0
    ? "Sin ninguna pista: esto es simplemente lo frecuente que es cada cultivo en los datos."
    : `Calculado con ${numPistas} de 7 pistas.`;

  let html = `<p class="nota-evidencia">${textoPistas}</p>`;

  for (const [cultivo, prob] of ranking) {
    const nombre = CULTIVOS[cultivo] ?? cultivo;
    html += `
      <div class="cultivo">
        <div class="cultivo-linea">
          <span class="cultivo-nombre">${nombre}
            <span class="cultivo-original">(${cultivo})</span></span>
          <span class="cultivo-prob">${(prob * 100).toFixed(1)}%</span>
        </div>
        <div class="barra"><div class="barra-relleno" data-ancho="${prob * 100}"></div></div>
      </div>`;
  }

  // Si la mejor opción no llega al 50%, avisamos de la incertidumbre:
  // es la "honestidad" de las redes bayesianas que vimos en clase
  if (ranking[0][1] < 0.5) {
    html += `<div class="aviso-incertidumbre">🤔 El modelo no está muy seguro:
      la probabilidad se reparte entre varios cultivos. Añade más pistas
      (por ejemplo, la lluvia o la humedad) para afinar la recomendación.</div>`;
  }

  zonaResultado.innerHTML = html;

  // Animamos las barras tras pintarlas
  requestAnimationFrame(() => {
    for (const barra of zonaResultado.querySelectorAll(".barra-relleno")) {
      barra.style.width = barra.dataset.ancho + "%";
    }
  });
}
