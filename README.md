# 🌾 ¿Qué siembro? — Recomendador de cultivos con una red bayesiana

Aplicación web (HTML + CSS + JavaScript puro, sin frameworks ni servidor) que recomienda qué cultivo sembrar según las condiciones de suelo y clima de una parcela. Utiliza una **red bayesiana discreta** entrenada en Python con [pgmpy](https://pgmpy.org) durante la práctica *«Recomendación de cultivos con Redes Bayesianas»* del curso **Introducción al Big Data e IA** (Módulo 3 — Ciencia de Datos e IA).

La idea clave del proyecto: una red bayesiana entrenada no es más que un grafo y unas **tablas de probabilidad**. Python solo hace falta para *aprender* esas tablas; una vez exportadas a JSON, la *inferencia* (calcular la probabilidad de cada cultivo dadas las pistas del usuario) puede hacerse íntegramente en el navegador con unas pocas líneas de JavaScript.

## Demo rápida

Descarga o clona el repositorio y abre `index.html` con doble clic. No necesitas instalar nada: el modelo va embebido en `modelo.js`, así que la app funciona sin servidor y sin conexión (salvo las fuentes de Google Fonts, que son opcionales).

Marca el nivel (`bajo` / `medio` / `alto`) de las variables que conozcas de tu parcela y pulsa **Recomendar cultivo**. Las variables que dejes en «No lo sé» se tratan como evidencia parcial: el modelo razona igual, pero repartirá la probabilidad entre más cultivos — la app te avisa cuando la incertidumbre es alta.

## Estructura del proyecto

| Fichero | Qué es |
|---|---|
| `index.html` | Estructura de la página: la ficha de la parcela y la zona de resultados. |
| `style.css` | Estilos (paleta «cuaderno de campo», selectores segmentados, barras de probabilidad). |
| `app.js` | Lógica: construye el formulario, implementa la inferencia bayesiana y pinta el resultado. |
| `modelo.js` | El modelo entrenado (estados, CPDs y límites de discretización) como variable JavaScript. |
| `modelo.json` | El mismo modelo en JSON estándar, por si prefieres cargarlo con `fetch()`. |
| `celda_exportacion_notebook.py` | Celda para pegar al final del notebook de la práctica y regenerar `modelo.js`. |

## Cómo funciona la inferencia (en 3 pasos)

1. **El modelo son tablas.** `modelo.js` contiene, para cada variable, sus estados posibles y su tabla de probabilidad condicional (CPD): por ejemplo, *«si el cultivo es arroz, la lluvia es alta el 92% de las veces»*.
2. **Enumeración de la conjunta.** Para responder a *«¿qué cultivo, dadas estas pistas?»*, `app.js` recorre todas las combinaciones de valores compatibles con la evidencia, multiplica las probabilidades locales de cada nodo y acumula el total por cultivo. Con 7 variables de 3 niveles y 22 cultivos hay como mucho 3⁷ × 22 ≈ 48 000 combinaciones: el navegador las recorre en unos 50 ms en el peor caso.
3. **Normalización.** Se divide entre la suma total para que las probabilidades de los 22 cultivos sumen 1, y se muestra el top 5.

Los resultados coinciden con los de `VariableElimination` de pgmpy hasta el decimosexto decimal en los casos de prueba del notebook.

## Cómo reentrenar y exportar el modelo

El modelo incluido se entrenó con el [Crop Recommendation Dataset](https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset) (2200 fichas, 22 cultivos) siguiendo exactamente el notebook de la práctica: discretización en terciles con `pd.qcut`, descubrimiento de estructura con `HillClimbSearch` (criterio BIC) y ajuste de las CPDs con el estimador bayesiano `BDeu` (`equivalent_sample_size=10`), usando **pgmpy 1.1.2**.

Para regenerarlo (por ejemplo, tras cambiar el número de niveles o el algoritmo de descubrimiento):

1. Ejecuta el notebook de la práctica hasta la sección 6 incluida (necesitas las variables `modelo` y `limites`).
2. Pega y ejecuta el contenido de `celda_exportacion_notebook.py` en una celda nueva al final.
3. Copia el `modelo.js` generado a la carpeta de la app, sustituyendo el existente. Recarga `index.html` y listo.

## Publicar la app

Al ser ficheros estáticos, puede publicarse gratis con GitHub Pages: en el repositorio, ve a *Settings → Pages*, elige la rama `main` y la carpeta raíz, y en un minuto tendrás la app en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

## Ideas para ampliar (ejercicios)

- **Entrada con valores reales**: sustituir los selectores bajo/medio/alto por campos numéricos (25 °C, 200 mm...) y convertirlos a niveles usando los cortes de `MODELO.limites`, que ya están exportados.
- **Explicar la recomendación**: mostrar, junto al cultivo ganador, las CPDs que más han influido («el arroz destaca porque con lluvia alta su probabilidad se multiplica por...»).
- **Dibujar el grafo**: pintar el mapa de relaciones de la red en la propia página (por ejemplo, con SVG).
- **Comparar modelos**: exportar un segundo modelo entrenado con 5 niveles (`q=5`) o con el algoritmo `PC`, y añadir un conmutador para comparar recomendaciones.

## Limitaciones

El dataset es relativamente pequeño (100 fichas por cultivo) y refleja probablemente condiciones agrícolas de una región concreta (India), y la discretización en 3 niveles pierde matices. Es un proyecto **didáctico**: antes de usarlo para decisiones agrícolas reales habría que validarlo con datos locales.

## Créditos

- Dataset: *Crop Recommendation Dataset* (Atharva Ingle, Kaggle, licencia según su página).
- Modelado: [pgmpy](https://pgmpy.org) 1.1.2.
- Práctica original: curso «Introducción al Big Data e IA», Módulo 3.
