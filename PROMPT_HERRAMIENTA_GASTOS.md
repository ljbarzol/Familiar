# PROMPT: HERRAMIENTA DE CONTROL DE GASTOS FAMILIARES COMPARTIDOS

## CONTEXTO Y OBJETIVO
Crear una aplicación web interactiva que permita a una familia (3-4 personas) registrar, rastrear y analizar gastos compartidos e individuales, con capacidad de:
- Registrar 3 tipos de transacciones diferentes
- Calcular quién debe a quién
- Analizar gastos con subcategorías
- Comparar períodos mensuales
- Establecer metas presupuestarias

---

## DATOS CLAVE DE LA FAMILIA
- **Miembros:** 3-4 personas (nombres a definir al inicio)
- **Moneda:** USD ($)
- **Frecuencia de liquidación:** Mensual o quincenal
- **Dispositivos:** Todos tienen celular e internet, nivel tech bajo-medio
- **Requisitos:** Interfaz simple, intuitiva, sin logins

---

## TIPOS DE TRANSACCIONES A REGISTRAR

### TIPO 1: PRÉSTAMOS DE EFECTIVO
**Descripción:** Dinero en efectivo que una persona le da a otra sin gastar aún
**Campos:**
- Persona que da
- Persona que recibe
- Monto (USD)
- Descripción (ej: "Efectivo para mercado", "Para pagar X cosa")
- Fecha
- Propósito: INDIVIDUAL o FAMILIAR

**Icono/Diferenciador:** 💵 PRÉSTAMO
**Lógica:** Genera una deuda inmediata. Si A le da $20 a B, B le debe $20 a A.

**Ejemplo:**
- Yo le di $20 a mamá (para que ella compre en el mercado)
- → Mamá me debe $20 hasta que gaste ese dinero y se liquide

---

### TIPO 2: GASTOS FAMILIARES (Se reparten)
**Descripción:** Dinero gastado en cosas que benefician a toda la familia
**Campos:**
- Persona que pagó
- Monto (USD)
- Categoría principal (Servicios Básicos, Mercado, Comisariato, Otros)
- Subcategoría (se define según categoría - ver tabla abajo)
- Descripción detallada
- Fecha
- ¿Es gasto FIJO mensual? Sí/No
- Si es fijo: indicar próxima fecha de pago esperado

**Icono/Diferenciador:** 🏠 GASTO FAMILIAR
**Lógica:** Se divide equitativamente entre todos los miembros. La app calcula cuánto "debería" haber pagado cada uno.

**Ejemplo:**
- Mamá pagó $30 en luz (Servicios Básicos)
- Total dividido entre 3 = $10 c/u
- Mamá pagó $30, debería pagar $10 → Le deben $20
- Tú debería pagar $10, pagaste $0 → Les debes $10

---

### TIPO 3: GASTOS INDIVIDUALES (No se reparten)
**Descripción:** Dinero gastado en cosas que solo benefician a una persona
**Campos:**
- Persona que pagó
- Monto (USD)
- Categoría (Medicina, Ropa, Transporte personal, Entretenimiento, Otros)
- Descripción
- Fecha
- ¿Fue con efectivo prestado? Sí/No + de quién

**Icono/Diferenciador:** 👤 GASTO INDIVIDUAL
**Lógica:** No se divide. Cada quien paga lo suyo. Pero se registra para historial.

**Ejemplo:**
- Mamá gastó $20 en medicinas (Gasto Individual)
- → Solo mamá paga esos $20
- Pero si fue con dinero que le prestaste, cuando se liquide esos $20 se cuentan hacia lo que ella te debe

---

## ESTRUCTURA DE CATEGORÍAS Y SUBCATEGORÍAS

### SERVICIOS BÁSICOS
- Luz
- Agua
- Internet
- Gas
- Teléfono
- Otros servicios

### MERCADO (Comida)
- Carne y proteínas
- Frutas
- Verduras
- Lácteos
- Granos y cereales
- Bebidas
- Condimentos y aditivos
- Otros

### COMISARIATO (Compras varias)
- Artículos de limpieza
- Artículos de higiene personal
- Papel y servilletas
- Otros artículos

### TRANSPORTE
- Gasolina
- Transporte público
- Mantenimiento vehículo
- Estacionamiento
- Otros

### SALUD
- Medicinas
- Médico/Consultas
- Dentista
- Otros

### EDUCACIÓN
- Útiles escolares
- Cuotas/Mensualidades
- Otros

### OTROS
- Cualquier cosa que no encaje

---

## FUNCIONALIDADES PRINCIPALES

### 1. PANTALLA INICIAL / SETUP
**Primera vez que abren la app:**
- Pedir nombres de los 3-4 miembros de la familia
- Guardar en localStorage
- Opción de editar nombres después
- Permitir agregar/quitar miembros

---

### 2. VISTA PRINCIPAL (Agregar Transacciones)

#### 2.1 AGREGAR PRÉSTAMO
Botón grande: "+ PRÉSTAMO"
Formulario modal/inline:
- Select: "Yo le doy dinero a..." (dropdown con nombres)
- Input: Monto
- Input: Descripción
- Select: ¿Para qué? (INDIVIDUAL / FAMILIAR)
- Datepicker: Fecha (default = hoy)
- Botón: "Registrar préstamo"

#### 2.2 AGREGAR GASTO FAMILIAR
Botón grande: "+ GASTO FAMILIAR"
Formulario modal/inline:
- Select: "Yo pagué..." (dropdown con nombres - quién pagó)
- Input: Monto
- Select: Categoría principal (Servicios, Mercado, Comisariato, Transporte, Salud, Educación, Otros)
- Select: Subcategoría (cambia según categoría elegida)
- Input: Descripción detallada
- Toggle: "¿Es un gasto fijo mensual?" Sí/No
  - Si Sí: Datepicker "Próximo pago esperado"
- Datepicker: Fecha (default = hoy)
- Botón: "Registrar gasto familiar"

#### 2.3 AGREGAR GASTO INDIVIDUAL
Botón grande: "+ GASTO INDIVIDUAL"
Formulario modal/inline:
- Select: "Yo gasté..." (dropdown)
- Input: Monto
- Select: Categoría (Medicina, Ropa, Transporte personal, Entretenimiento, Otros)
- Input: Descripción
- Toggle: "¿Fue con dinero prestado?" Sí/No
  - Si Sí: Select "De quién me lo prestaron"
- Datepicker: Fecha (default = hoy)
- Botón: "Registrar gasto individual"

---

### 3. HISTORIAL COMPLETO
**Vista:** Lista cronológica de todas las transacciones
**Muestra:**
- Fecha y hora
- Tipo: 💵 PRÉSTAMO / 🏠 FAMILIAR / 👤 INDIVIDUAL
- Descripción clara (ej: "Juan le dio $20 a María")
- Monto
- Categoría (si aplica)
- Subcategoría (si aplica)
- Botón de eliminar (por si hay error)

**Filtros rápidos:**
- Por persona
- Por tipo (Préstamo / Familiar / Individual)
- Por categoría
- Por mes

**Búsqueda:** Por descripción

---

### 4. DASHBOARD / ANÁLISIS

#### 4.1 RESUMEN DEL MES ACTUAL
Tarjetas mostrando:
- **Gasto Total Familiar:** $XXX (solo gastos FAMILIARES)
- **Gasto Total Individual:** $XXX (solo gastos INDIVIDUALES)
- **Total Dinero Prestado:** $XXX (dinero en efectivo prestado aún sin gastar)
- **Gasto Promedio por Persona:** $XXX (solo familiares)

#### 4.2 TABLA: "QUIÉN DEBE A QUIÉN"
Tabla clara mostrando:
- Juan debe $50 a María
- Pedro debe $30 a Juan
- Ana le debe $20 a Juan
- etc.

**Lógica:** Considera GASTOS FAMILIARES + PRÉSTAMOS en efectivo

**Ejemplo cálculo:**
```
PRÉSTAMOS PENDIENTES:
- Juan le dio $20 a María → María le debe $20

GASTOS FAMILIARES:
- Total mes: $300, dividido entre 3 = $100 c/u
- Juan pagó: $150 (debería: $100) → Le deben $50
- María pagó: $100 (debería: $100) → Está quita
- Pedro pagó: $50 (debería: $100) → Debe $50

BALANCE FINAL (combinado):
- María le debe a Juan: $20 (préstamo) + $0 = $20
- Pedro le debe a Juan: $50 (gastos) + $0 = $50
- Pedro le debe a María: $0
```

#### 4.3 RANKING DE GASTADORES
Tabla: Quién pagó más en gastos familiares
- Persona | Monto pagado | Debería pagar | Diferencia

#### 4.4 GASTOS POR CATEGORÍA
Gráfico pastel/barras mostrando:
- Mercado: $XXX (XX%)
- Servicios: $XXX (XX%)
- Comisariato: $XXX (XX%)
- etc.

#### 4.5 SUBCATEGORÍAS DETALLADAS
Expandible por categoría principal:
**MERCADO:**
- Carne y proteínas: $120
- Frutas: $45
- Verduras: $60
- Lácteos: $35
- Granos: $40
- Bebidas: $25
- Condimentos: $15
- Otros: $10

(Mostrar en tabla o gráfico, con opción de expandir)

#### 4.6 GASTOS FIJOS VS VARIABLES
Tabla separando:
- **FIJOS (se repiten mensualmente):**
  - Juan pagó luz: $20 (próximo: 05/sept)
  - María pagó agua: $30 (próximo: 10/sept)
  - etc.
- **VARIABLES:**
  - Mercado
  - Comisariato
  - etc.

#### 4.7 COMPARATIVA CON MES ANTERIOR
Mostrando:
- **Agosto:** Mercado $450, Servicios $100, etc.
- **Septiembre (actual):** Mercado $480, Servicios $100, etc.
- **Cambio:** Mercado ↑ $30, Servicios ↓ $10

Gráfico comparativo lado a lado

#### 4.8 META PRESUPUESTARIA
Input: "¿Cuál es la meta de gasto familiar este mes?" (ej: $500)
Mostrar:
- Meta: $500
- Gastado hasta hoy: $380
- Disponible: $120
- Porcentaje: 76% del presupuesto usado
- Indicador visual (barra con colores: verde si está bien, amarillo si está cercano, rojo si pasó)

---

### 5. GESTIÓN DE MESES
**Botón: "Cambiar mes"**
- Dropdown/Calendario para seleccionar mes-año
- Ver datos del mes seleccionado
- Comparar automáticamente con mes anterior

**Botón: "Cerrar mes actual"**
- Confirma que quieren cerrar agosto
- Guarda el resumen de agosto
- Prepara para nuevo mes
- IMPORTANTE: Mantiene historial para futuras comparativas

**Botón: "Nuevo mes"**
- Limpia transacciones (pero las guarda en historial)
- Comienza mes nuevo
- Gastos FIJOS se pueden copiar automáticamente (opcional)

---

### 6. PANTALLA DE CONFIGURACIÓN
- Nombres de miembros (editar)
- Agregar/quitar miembros
- Establecer meta presupuestaria mensual
- Definir quién está activo
- Exportar datos (opcional)

---

## ALMACENAMIENTO Y PERSISTENCIA

### localStorage (Datos guardados en el navegador)
```javascript
{
  "miembros": ["Juan", "María", "Pedro", "Ana"],
  
  "transacciones": [
    {
      id: "tx_001",
      tipo: "préstamo", // "préstamo", "familiar", "individual"
      fecha: "2024-09-15",
      monto: 20,
      de: "Juan",
      para: "María",
      descripcion: "Efectivo para mercado",
      proposito: "familiar", // solo en préstamos
      categoriaFamiliar: null,
      subcategoriaFamiliar: null,
      esijo: false,
      proximoPago: null
    },
    {
      id: "tx_002",
      tipo: "familiar",
      fecha: "2024-09-15",
      monto: 30,
      quienPago: "María",
      descripcion: "Pago de agua",
      categoriaFamiliar: "Servicios Básicos",
      subcategoriaFamiliar: "Agua",
      esijo: false,
      proximoPago: "2024-10-15"
    },
    {
      id: "tx_003",
      tipo: "individual",
      fecha: "2024-09-16",
      monto: 20,
      quienPago: "Pedro",
      descripcion: "Medicinas",
      categoriaIndividual: "Medicina",
      conDineroPrestado: true,
      dequienPrestado: "Juan"
    }
  ],
  
  "meses": {
    "2024-09": {
      metaPresupuestaria: 500,
      cerrado: false,
      resumen: { /* datos resumen */ }
    },
    "2024-08": {
      metaPresupuestaria: 480,
      cerrado: true,
      resumen: { /* datos resumen */ }
    }
  }
}
```

---

## LÓGICA DE CÁLCULOS

### CÁLCULO: "QUIÉN DEBE A QUIÉN"

**Paso 1: Sumar deudas por préstamos**
```
Para cada préstamo:
  De → Para: Monto
Resultado: deudaPrestamos[]
```

**Paso 2: Sumar gastos familiares y calcular proporciones**
```
gastosPersona = suma de gastos pagados por cada persona
totalGastos = suma de todos los gastos
debePerPerson = totalGastos / cantidad de miembros

deuda = gastosPersona - debePerPerson
Si deuda > 0: Esta persona le da dinero a los demás
Si deuda < 0: Esta persona les debe dinero
```

**Paso 3: Combinar ambas deudas**
```
Para cada persona:
  deudaTotal = deudaPrestamos + deudaGastos
  
Simplificar: Si A le debe a B $20 y B le debe a A $10
  → A le debe a B: $10 (neto)
```

**Paso 4: Mostrar en tabla clara**

---

### CÁLCULO: GASTOS POR CATEGORÍA
```
Por cada transacción de tipo "familiar":
  categoriaGastos[categoria][subcategoria] += monto
  
Resultado: Tabla de totales y porcentajes
```

---

### CÁLCULO: COMPARATIVA MES A MES
```
mesActual = suma de gastos por categoría
mesAnterior = suma de gastos por categoría (del mes anterior guardado)

cambio = mesActual - mesAnterior
porcentajeCambio = (cambio / mesAnterior) * 100

Mostrar: ↑/↓ con color rojo/verde
```

---

## INTERFAZ / UX

### Principios de diseño:
1. **Mobile-first:** Botones grandes, fáciles de tocar
2. **Colores:**
   - 💵 Préstamo: Azul
   - 🏠 Familiar: Verde
   - 👤 Individual: Naranja
3. **Tipografía clara:** Sin jerga, títulos grandes
4. **Confirmaciones visuales:** Mensajes cuando se agrega algo
5. **Sin logins:** Acceso directo

### Estructura de navegación:
```
TAB 1: AGREGAR (formularios)
TAB 2: HISTORIAL (lista de transacciones)
TAB 3: ANÁLISIS (dashboard, gráficos)
TAB 4: CONFIGURACIÓN (nombres, metas)
```

---

## VALIDACIONES

- Monto debe ser > 0
- Monto debe ser número válido
- Descripción no vacía
- Ambas personas en un préstamo deben ser diferentes
- Fecha no puede ser en el futuro (por defecto)
- Al cambiar mes, guardar datos del mes anterior

---

## NOTAS IMPORTANTES

1. **Gastos FIJOS:** Mostrar próximo pago esperado, considerar si es gasto del mes actual
2. **Historial:** Mantener datos de todos los meses anteriores (para comparativas)
3. **Simplicidad:** Interfaz limpia, sin opciones complicadas
4. **Offline:** Funciona sin internet (los datos están locales)
5. **Exportar (opcional):** Permitir descargar resumen en PDF o Excel

---

## TECH STACK RECOMENDADO

- **Frontend:** HTML + CSS + JavaScript vanilla (o React simple)
- **Almacenamiento:** localStorage del navegador
- **Gráficos:** Chart.js o similar (ligero)
- **Responsiveness:** Flexbox/Grid CSS

---

## FLUJO DE USO (DÍA A DÍA)

```
LUNES:
1. Abres la app
2. Presionas "+ PRÉSTAMO"
3. "Yo le doy dinero a mamá", $20, "Para mercado", FAMILIAR
4. Registras

MARTES:
1. Mamá gasta los $20 en comida en mercado
2. Presionas "+ GASTO FAMILIAR"
3. "Mamá pagó", $20, Mercado → Carne y proteínas, "Mercado semanal"
4. Registras

MIÉRCOLES:
1. Tú compras en comisariato $50
2. "+ GASTO FAMILIAR"
3. "Yo pagué", $50, Comisariato → Artículos limpieza, "Compras semanales"
4. Registras

VIERNES:
1. Revisas el ANÁLISIS
2. Ves que mercado va en $100 (carne: $60, verduras: $30)
3. Ves que gastos van $150, falta llegar a meta de $200
4. Ves que hermana le debe dinero

FIN DE MES:
1. Presionas "Cambiar mes"
2. Ves resumen completo
3. Ves comparativa con mes anterior
4. Se pasan el dinero para equilibrar
5. Presionas "Nuevo mes"
6. Listo para septiembre
```

---

## CASOS DE USO ESPECÍFICOS

### Caso 1: Tú sacas $100, lo reparten
```
- Yo saqué $100 (se registra en historial)
- Yo le di $20 a mamá [PRÉSTAMO]
- Mamá gastó $20 en comida [FAMILIAR]
- Yo gasté $30 en supermercado [FAMILIAR]
- Hermana gastó $15 en servicios [FAMILIAR]
- Total gastado de tu dinero: $65
- Sobrante: $35 (que guardas o distribuyes)
→ Al final: Mamá te debe $20, hermana te debe $15
```

### Caso 2: Servicios fijos
```
- Cada mes tú pagas luz: $20 [FAMILIAR + FIJO]
- Cada mes hermana paga agua: $30 [FAMILIAR + FIJO]
- App muestra próximo pago esperado de cada uno
- Al cambiar mes, se pueden auto-copiar (opcional)
```

### Caso 3: Gasto individual con dinero prestado
```
- Tú le prestaste $20 a mamá [PRÉSTAMO]
- Mamá gastó esos $20 en medicinas [INDIVIDUAL + Con dinero prestado]
- App calcula: Mamá te debe $20 (por el gasto médico)
- Pero también es dinero que le prestaste
→ Se cuenta solo una vez, no doble
```

---

## DIFERENCIALES CLAVE

✅ Registra 3 tipos de transacciones (no solo "gastos")
✅ Calcula deudas considerando préstamos + gastos
✅ Subcategorías para análisis profundo
✅ Comparativa histórica mes a mes
✅ Meta presupuestaria configurable
✅ Gastos FIJOS identificados
✅ Interfaz ultra simple, sin logins
✅ Offline-first (localStorage)
✅ Mobile-friendly
✅ Historial completo

---

**Este es el blueprint completo. La app debe ser funcional, intuitiva y resolver el problema real de la familia.**
