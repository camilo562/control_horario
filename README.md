# Control Horario React + MySQL

Aplicacion de control horario para SAMMERS-JEANS con frontend React/Vite y backend local Express conectado a MySQL.

## Base de datos

La base local se llama `HORARIOS`.

Para crearla en MySQL o MariaDB:

```bash
mysql -u root -p < database/horarios_mysql.sql
```

El script usa `CREATE DATABASE IF NOT EXISTS` y `CREATE TABLE IF NOT EXISTS`; no contiene `DROP TABLE`.

Usuario inicial:

```text
correo: admin@sammersjeans.com
clave: Admin123*
```

Cambia esa clave despues de entrar o reemplaza el hash antes de usarlo en produccion.

## Variables

Copia `.env.example` a `.env.local` y ajusta:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=HORARIOS
LOCAL_AUTH_SECRET=cambia-este-secreto-en-produccion
VITE_API_BASE_URL=/api
VITE_OTP_LOCAL_SIMULATION=true
```

Con `VITE_OTP_LOCAL_SIMULATION=true`, el registro muestra el codigo OTP en pantalla y no usa WhatsApp externo.

## Desarrollo

Terminal 1:

```bash
npm run dev:api
```

Terminal 2:

```bash
npm run dev
```

Vite redirige `/api` hacia `http://localhost:3000`.

## Produccion

Compila el frontend:

```bash
npm run build
```

Puedes servir `dist` con Nginx y hacer proxy de `/api` al backend Node, o ejecutar el backend sirviendo estaticos con:

```env
SERVE_STATIC=true
```

```bash
npm start
```

En el VPS el backend queda como servicio systemd:

```bash
systemctl status horarios.service
systemctl restart horarios.service
```
