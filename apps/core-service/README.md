## Package.json

### En package.json se definen dos archivos de configuracion

- **drizzle.config.postgres.ts** como el archivo de configuracion para la base de datos principal.

- **drizzle.config.d1.ts** para la configuracion de datos en D1 con drizzle en el futuro, la configuración de D1 al ser aún tan pequeña, se puede hacer con queries en crudo, sin necesidad de esquemas, esto se cambiara en el futuro si las bases de datos y tablas crecen. **drizzle.config.d1.ts** se dejara como archivo vacío.
