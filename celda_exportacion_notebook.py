# =====================================================================
# NUEVA SECCIÓN PARA EL NOTEBOOK: Exportar el modelo para la app web
# ---------------------------------------------------------------------
# Pega esta celda AL FINAL del notebook, después de la sección 6
# (necesita las variables `modelo` y `limites` ya creadas).
#
# Genera dos ficheros en la misma carpeta que el notebook:
#   - modelo.json : los datos del modelo en formato estándar
#   - modelo.js   : lo mismo, envuelto en una variable JavaScript
#                   (const MODELO = ...), para que la app funcione
#                   abriendo index.html con doble clic, sin servidor.
#
# ¿Qué exportamos? Una red bayesiana entrenada son solo TABLAS:
# los estados de cada variable, las tablas de probabilidad
# condicional (CPDs) y —para poder traducir valores reales como
# 25 °C a bajo/medio/alto— los cortes de los terciles.
# =====================================================================
import json

export = {
    "variables": {},   # estados posibles de cada variable
    "cpds": [],        # tablas de probabilidad condicional
    "limites": {col: [float(x) for x in bins] for col, bins in limites.items()},
    "objetivo": "label",
}

for cpd in modelo.get_cpds():
    var = cpd.variable
    padres = list(cpd.variables[1:])   # orden de los padres en la tabla
    export["variables"][var] = list(cpd.state_names[var])
    export["cpds"].append({
        "variable": var,
        "padres": padres,
        "estados_padres": {p: list(cpd.state_names[p]) for p in padres},
        # matriz de (nº estados de la variable) filas x (combinaciones de
        # los padres) columnas; el ÚLTIMO padre varía más rápido
        "valores": cpd.get_values().tolist(),
    })

with open("modelo.json", "w", encoding="utf-8") as f:
    json.dump(export, f, ensure_ascii=False)

with open("modelo.js", "w", encoding="utf-8") as f:
    f.write("const MODELO = ")
    json.dump(export, f, ensure_ascii=False)
    f.write(";\n")

print("✅ Modelo exportado: modelo.json y modelo.js")
print("   Copia modelo.js a la carpeta de la app web y abre index.html.")
