## Evolución

Una posible evolución de la gestion de la base de datos es pasando en ves de tener un CRUD por peticion ej: getConnections lo que limita consultas, pasar el "db"
entero de drizzle al worker que lo necesite y que se cree su propia query individualmente db.insert/db.create etc.. y este worker, por su lado se encarga de la gestion del cache
por petición de manera inteligente.
