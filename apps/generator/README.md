## Metadatos de la generación

### subscribedToAssistant en conexiones Directas/Organizacionales

La columna **subscribedToAssistant** puede estar vacía en el caso de una conexión **directa** si el usuario no ha suscrito su Whatsapp u otra aplicacion (en el futuro) con algun asistente.

En el caso de la conexión **organizacional** esta columna siempre debe tener el ID de un asistente, de esta forma la organizacion por medio del asistente contacta sin problemas al usuario.

En los metadatos enviados se asigna **assistantId** si el tipo de conexión es organizacional el id del asistente suscrito por esa conexión.
Si el tipo de conexión es directa se asigna simplemente como "impretion", esta interacción no ha sido con un asistente común, si no con el de impretion.

Con estos datos el AI Gateway tendra los metadatos necesarios de cada interacción.
