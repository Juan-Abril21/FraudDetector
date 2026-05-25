# 🛡️ FraudShield — Sistema de Detección de Fraude en Tarjetas de Crédito

Sistema de detección de fraude en tiempo real basado en machine learning, construido con FastAPI (backend) y React + Vite (frontend). Analiza transacciones de tarjetas de crédito y emite decisiones automáticas: **Approved**, **Review** o **Blocked**.

> Proyecto desarrollado por Mateo González, Bryam Díaz, Juan Abril y Caren Piñeros — Mayo 2026.

---

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos Previos](#requisitos-previos)
- [Instalación y Ejecución](#instalación-y-ejecución)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [API Reference](#api-reference)
- [Dataset](#dataset)
- [Modelo de ML](#modelo-de-ml)
- [Lógica de Decisión](#lógica-de-decisión)
- [Interfaz de Usuario](#interfaz-de-usuario)
- [Variables de Entrada](#variables-de-entrada)
- [Ejemplos de Uso](#ejemplos-de-uso)

---

## Descripción General

FraudShield monitorea transacciones financieras y clasifica cada operación en tiempo real. El sistema combina un modelo de machine learning entrenado sobre el dataset de Kaggle *Credit Card Fraud Detection* con una interfaz web donde se pueden ingresar transacciones manualmente, cargar archivos CSV o utilizar datos de muestra.

**Flujo principal:**

```
Transacción → API FastAPI → Escalado de features → Modelo ML → Puntuación de riesgo → Decisión
```

---

## Arquitectura

```
project/
├── backend/          ← API FastAPI + modelo ML
└── frontend/
    └── Deteccion de Fraude/   ← App React + Vite
```

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend API | Python 3 · FastAPI · Uvicorn |
| ML | scikit-learn · joblib |
| Frontend | React 19 · Vite 8 · Axios |
| Dataset | Kaggle Credit Card Fraud Detection |

---

## Estructura del Proyecto

```
project/
├── backend/
│   ├── main.py               # Servidor FastAPI, endpoint /predict
│   ├── fraud_model.pkl       # Modelo entrenado (generado en entrenamiento)
│   ├── amount_scaler.pkl     # Scaler para la columna Amount
│   ├── time_scaler.pkl       # Scaler para la columna Time
│   └── .gitignore
│
└── frontend/
    └── Deteccion de Fraude/
        ├── src/
        │   ├── App.jsx       # Componente principal de la app
        │   ├── App.css       # Estilos globales
        │   └── main.jsx      # Punto de entrada React
        ├── public/
        │   ├── favicon.svg
        │   └── icons.svg
        ├── index.html
        ├── vite.config.js
        └── package.json
```

---

## Requisitos Previos

### Backend
- Python 3.9+
- pip

### Frontend
- Node.js 20.19+ o ≥ 22.12
- npm

---

## Instalación y Ejecución

### Backend

```bash
# 1. Entrar al directorio del backend
cd project/backend

# 2. Crear y activar entorno virtual (recomendado)
python -m venv .venv
source .venv/bin/activate       # Linux / macOS
.venv\Scripts\activate          # Windows

# 3. Instalar dependencias
pip install fastapi uvicorn pandas numpy scikit-learn joblib

# 4. Asegurarse de que los archivos .pkl están presentes:
#    fraud_model.pkl · amount_scaler.pkl · time_scaler.pkl

# 5. Iniciar el servidor
uvicorn main:app --reload --port 8000
```

El servidor quedará disponible en `http://127.0.0.1:8000`.

> **Nota:** Los archivos `.pkl` se generan durante la fase de entrenamiento del modelo. Si no los tienes, debes entrenar el modelo con el dataset de Kaggle antes de ejecutar el backend.

---

### Frontend

```bash
# 1. Entrar al directorio del frontend
cd "project/frontend/Deteccion de Fraude"

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173` (o el puerto que indique Vite).

> El frontend se conecta al backend en `http://127.0.0.1:8000`. Asegúrate de que el backend esté corriendo antes de usar la app.

---

## API Reference

### `GET /`

Verifica que el servidor está activo.

**Respuesta:**
```json
{
  "message": "Fraud Detection API Running"
}
```

---

### `POST /predict`

Analiza una transacción y devuelve la puntuación de riesgo y la decisión.

**Content-Type:** `application/json`

**Body:** Objeto con los 30 campos de la transacción (ver [Variables de Entrada](#variables-de-entrada)).

**Ejemplo de request:**
```json
{
  "Time": 406,
  "V1": -1.3598071,
  "V2": -0.0727812,
  ...
  "V28": -0.0210530,
  "Amount": 149.62
}
```

**Respuesta:**
```json
{
  "risk_score": 0.0312,
  "decision": "APPROVED"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `risk_score` | `float` | Probabilidad de fraude entre 0.0 y 1.0 |
| `decision` | `string` | `APPROVED`, `REVIEW` o `BLOCKED` |

---

## Dataset

El modelo fue entrenado con el dataset público **[Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)** de Kaggle.

- **284,807 transacciones** de tarjetas de crédito europeas (septiembre 2013)
- **492 fraudes** (~0.17% del total) — dataset altamente desbalanceado
- Las columnas `V1`–`V28` son componentes PCA (anonimizadas por confidencialidad)
- Las columnas `Time` y `Amount` son las únicas sin transformación PCA

---

## Modelo de ML

El backend carga tres artefactos generados durante el entrenamiento:

| Archivo | Descripción |
|---------|-------------|
| `fraud_model.pkl` | Clasificador entrenado (Random Forest / XGBoost o similar) |
| `amount_scaler.pkl` | `StandardScaler` ajustado sobre la columna `Amount` |
| `time_scaler.pkl` | `StandardScaler` ajustado sobre la columna `Time` |

**Preprocesamiento en inferencia:**
1. Se reciben los 30 campos de la transacción.
2. `Amount` y `Time` se escalan con sus respectivos scalers.
3. El vector resultante se pasa al modelo.
4. Se extrae `predict_proba(data)[0][1]` como puntuación de riesgo.

---

## Lógica de Decisión

| Puntuación de Riesgo | Decisión | Descripción |
|---------------------|----------|-------------|
| < 0.30 | ✅ **APPROVED** | Transacción dentro de parámetros normales |
| 0.30 – 0.70 | ⚠️ **REVIEW** | Verificación adicional recomendada |
| > 0.70 | ❌ **BLOCKED** | Transacción bloqueada por alto riesgo |

---

## Interfaz de Usuario

La aplicación React ofrece:

- **Ingreso manual:** Formulario con los 30 campos (Time, Amount, V1–V28).
- **Vista JSON:** Editor de texto para pegar o editar el payload directamente.
- **Datos de muestra:** Botones para cargar una transacción normal o una sospechosa (datos reales del dataset de Kaggle).
- **Carga de CSV:** Importa la primera fila de un archivo en formato `creditcard.csv`.
- **Panel de resultado:** Muestra la decisión, puntuación de riesgo visual (barra de progreso) y una descripción.
- **Historial de sesión:** Lista las últimas 50 transacciones analizadas con monto, decisión, riesgo y hora.
- **Resumen de sesión:** Contadores de transacciones aprobadas, en revisión y bloqueadas.

---

## Variables de Entrada

El endpoint `/predict` espera un JSON con los siguientes campos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Time` | `float` | Segundos transcurridos desde la primera transacción del dataset |
| `Amount` | `float` | Monto de la transacción en USD |
| `V1` – `V28` | `float` | Componentes principales obtenidas por PCA (features anonimizadas) |

---

## Ejemplos de Uso

### Transacción normal (baja probabilidad de fraude)

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "Time": 406, "Amount": 149.62,
    "V1": -1.3598071, "V2": -0.0727812, "V3": 2.5363467, "V4": 1.3781553,
    "V5": -0.3383208, "V6": 0.4623878, "V7": 0.2395986, "V8": 0.0986979,
    "V9": 0.3637870, "V10": 0.0907942, "V11": -0.5515995, "V12": -0.6178009,
    "V13": -0.9913898, "V14": -0.3111694, "V15": 1.4681770, "V16": -0.4704005,
    "V17": 0.2079709, "V18": 0.0257906, "V19": 0.4039936, "V20": 0.2514121,
    "V21": -0.0183068, "V22": 0.2778376, "V23": -0.1104740, "V24": 0.0669281,
    "V25": 0.1285394, "V26": -0.1891093, "V27": 0.1335584, "V28": -0.0210530
  }'
```

**Respuesta esperada:**
```json
{ "risk_score": 0.03, "decision": "APPROVED" }
```

---

### Transacción sospechosa (alta probabilidad de fraude)

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "Time": 406, "Amount": 239.93,
    "V1": -3.0435406, "V2": -3.1572081, "V3": 1.0888809, "V4": 2.2886436,
    "V5": 1.3597843, "V6": -1.0664534, "V7": 0.9257636, "V8": -0.2818408,
    "V9": -0.4463591, "V10": -4.9778928, "V11": 2.3347659, "V12": -6.7218934,
    "V13": 0.2882374, "V14": -9.1570110, "V15": -0.1635476, "V16": -2.5959285,
    "V17": -7.5633966, "V18": 2.1420649, "V19": 0.4827623, "V20": 0.4277422,
    "V21": 0.4726985, "V22": -0.1839547, "V23": -0.4277264, "V24": -0.5357408,
    "V25": -0.2024282, "V26": -0.1660564, "V27": -0.1481793, "V28": 0.0579888
  }'
```

**Respuesta esperada:**
```json
{ "risk_score": 0.97, "decision": "BLOCKED" }
```

---

## Documentación Interactiva

FastAPI genera documentación automática disponible en:

- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc:** `http://127.0.0.1:8000/redoc`

---

## Integrantes

| Nombre | Rol |
|--------|-----|
| Mateo González | ML / Entrenamiento del modelo |
| Bryam Díaz | Backend / API |
| Juan Abril | Frontend / React |
| Caren Piñeros | Datos / Análisis |

---

*Proyecto académico — Detección de Fraude en Tarjetas de Crédito · Mayo 2026*
