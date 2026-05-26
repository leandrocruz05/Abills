# Integracion Balance en AbilLs

## Objetivo

Reemplazar la seccion Tareas por una seccion Balance que permita automatizar el trabajo manual que hoy se realiza en Excel sobre:
- Hoja del mes actual (ejemplo: MAYO)
- Hoja BALANCE (resumen anual y control)

La idea central es que los movimientos cargados en Finanzas alimenten automaticamente el Balance.

---

## Resumen Ejecutivo

La integracion es viable y conveniente.

El proyecto ya tiene una base financiera robusta por periodo mensual en Firestore (ingresos, egresos, cuentas, transacciones, recalc de saldos), por lo que no conviene replicar formulas de Excel celda por celda.

La recomendacion es:
1. Reemplazar Tareas por una pantalla Balance.
2. Construir Balance desde los datos ya existentes en Finanzas.
3. En una segunda etapa, ampliar el modelo de movimientos para llegar a una paridad alta con la plantilla Excel.

---

## Analisis de lo Realizado

### 1) Relevamiento de la app actual

Se identifico que Tareas hoy esta integrado en estos puntos:
- Tarjeta en Portada.
- Ruta dedicada en App.
- Componente propio con logica de tareas y planificador.

Por lo tanto, el reemplazo por Balance tiene una superficie de cambio clara y controlada.

### 2) Relevamiento del modelo financiero actual

La app ya guarda informacion mensual por usuario en Firestore con estructura de periodo (ano-mes), incluyendo:
- transacciones
- cuentas
- ingresoTotal
- gastosTotal
- categorias

Ademas, existe recalculo de saldos desde base del mes anterior + replay de transacciones, lo cual es una base excelente para generar balance mensual y anual sin procesos manuales.

### 3) Relevamiento de la plantilla Excel (AdminCuentas26.xlsx)

Se verificaron hojas y estructura:
- Balance
- General
- Ene, Feb, Mar, Abr, May

Hallazgos clave:
- Balance consolida por meses y por persona (Lean/Agus) con bloques de Ingresos, Gastos fijos, Gastos variables, Ahorro, Inversiones, Caja y Balance.
- May funciona como hoja operativa con detalle de gastos, tarjetas/bancos, division Lean/Agus/Ambos, e inversiones con arrastre.
- General contiene informacion auxiliar e historica.

Conclusion tecnica:
- El Excel tiene logica de negocio valiosa para el modelo.
- No conviene copiar formulas literalmente; conviene modelar reglas y calcular en la app.

---

## Cobertura Posible con el Modelo Actual (sin cambios grandes)

Con lo que hoy ya existe en Finanzas se puede automatizar:
- Totales de ingresos y egresos por mes.
- Saldo final de cuentas por mes.
- Balance mensual (ingresos - egresos).
- Consolidado anual por mes (matriz tipo hoja Balance).
- Resumen por categorias.

---

## Brecha con la Plantilla Excel (lo que falta modelar)

Para replicar mejor el comportamiento de la planilla, faltan campos/reglas en transacciones:
- Responsable del gasto/ingreso: Lean, Agus o Ambos.
- Regla de division: porcentual o fija.
- Tipo contable: fijo, variable, tarjeta, inversion, compartido, individual.
- Medio de pago/canal: debito, efectivo, banco, tarjeta.
- Cuotas: cantidad total, cuota actual, fecha/mes fin.
- Logica de inversiones: inicio/fin/resultado del periodo.
- Caja base (saldo inicial de ciclo) para trazabilidad historica como en Excel.

---

## Recomendacion de Implementacion

## Etapa 1 (impacto rapido, bajo riesgo)

Objetivo: reemplazar Tareas por Balance funcional usando datos ya disponibles.

Entregables:
1. Ruta y tarjeta Balance en lugar de Tareas.
2. Pantalla Balance con selector mes/ano.
3. Tabla de consolidado anual por meses.
4. Resumen mensual con: ingresos, egresos, ahorro, saldo final.
5. Mapeo configurable categoria -> bloque de balance (sin tocar formulas Excel).

Resultado esperado:
- El trabajo manual de pasar datos del mes al balance se reduce de forma importante.

## Etapa 2 (paridad alta con Excel)

Objetivo: acercar el sistema a la logica completa de la plantilla.

Entregables:
1. Extender transacciones con responsable, division, medio de pago y cuotas.
2. Reglas de reparto Lean/Agus/Ambos.
3. Balance segmentado por persona y consolidado total.
4. Modulo de inversiones con metricas de resultado por periodo.
5. (Opcional) Exportacion a Excel desde la app.

Resultado esperado:
- Balance casi equivalente al Excel pero con operacion digital y trazable.

---

## Riesgos y Consideraciones

- Riesgo de sobre-ingenieria si se intenta copiar Excel 1:1 desde el inicio.
- Riesgo de datos incompletos si no se incorporan campos nuevos en movimientos para Etapa 2.
- Recomendacion: avanzar incrementalmente, primero con automatizacion de alto valor (Etapa 1), luego precision contable avanzada (Etapa 2).

---

## Decision Recomendada

Implementar Etapa 1 de inmediato y definir en paralelo el contrato de datos de Etapa 2.

Esto permite:
- reemplazar Tareas por Balance ahora,
- mostrar valor rapido,
- y evitar retrabajo cuando se incorporen reglas de division y medios de pago.

---

## Checklist Sugerido de Proxima Ejecucion

- [ ] Crear componente Balance.
- [ ] Reemplazar accesos de Tareas por Balance en portada y rutas.
- [ ] Consumir datos de finanzas por periodo en Balance.
- [ ] Definir tabla de consolidado anual.
- [ ] Definir y guardar mapeo categoria -> bloque de balance.
- [ ] Validar resultados contra hoja MAY y BALANCE en un periodo de prueba.
- [ ] Planificar campos adicionales de Etapa 2.

---

## Nota

Este documento resume el analisis tecnico realizado sobre el estado actual de la app y la plantilla Excel AdminCuentas26.xlsx, junto con una propuesta concreta de evolucion por etapas.
