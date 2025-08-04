### MENSAJE ENTRANTE
## "/incoming-message"

Según el tipo de conexión obtenemos unos datos u otros, estos datos pueden ser "direct" u "organizational".

- Si es "organizational" es un mensaje entrante hacia un número de whatsapp registrado que atiende multiples usuarios, podemos entonces, obtener los datos en cache de conexión de este número. Así que obtenemos el parametro "To". En el cache, en el caso de "To" debemos tambien obtener el "From" para poder identificar el usuario que nos está enviando el mensaje.

- Si es "direct" es un mensaje entrante hacia el número de Impretion, es un usuario suscrito al asistente principal de Impretion, podemos entonces, obtener los datos en cache de conexión de este número. Asi que obtenemos el parametro "From".