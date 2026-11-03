# Gestión Pyme – web (primer tramo)
Login, selector de empresa y Ventas (listado con filtros, nueva venta con `emitir_comprobante`, comprobante imprimible).

1. Creá un proyecto en supabase.com y corré en el SQL Editor, en este orden:
   `schema_fases_1_a_4`, `02`, `04`, `06`, `08`, `10`, `12`, `14_crear_empresa` y `15_stock_inicial`.
2. (Desarrollo) En Authentication > Providers > Email desactivá "Confirm email" para entrar sin validar el mail.
3. Copiá `.env.local.example` a `.env.local` y completá la URL y la clave anon del proyecto (Settings > API).
4. `npm install` y `npm run dev` → http://localhost:3000
5. Producción: subí el repo a GitHub, importalo en Vercel y cargá las dos variables de entorno.

Pantallas: Ventas, Clientes y proveedores (con saldos y registro de cobros/pagos) y Productos (con stock y ajuste por conteo físico).
Para empezar: cargá clientes y productos desde esas pantallas; el stock entra por compras (egresos, todavía sin pantalla) o por un ajuste.
Los comprobantes son de gestión: sin CAE no tienen validez fiscal (falta la integración con ARCA).

## Pantallas (segundo tramo)
Egresos (compras y gastos, con categoría, forma de pago, cuenta corriente e ítems de mercadería), Caja y bancos (cuentas, saldos, transferencias),
IVA (liquidación mensual con cierre y libros de compras y ventas), Ganancias, Panel financiero, Panel económico (punto de equilibrio),
Panel impositivo y Contabilidad (libro diario, mayor, balance de sumas y saldos, estado de resultados, situación patrimonial y flujo de fondos).
Todas las pantallas con fechas permiten filtrar e imprimir / guardar en PDF desde el navegador.
Pendiente: plan de cuentas editable, asientos manuales, devengamientos y previsiones (las funciones ya existen en la base).
