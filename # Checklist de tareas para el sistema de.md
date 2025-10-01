# Checklist de tareas para el sistema de marcaje y gestión de mecánicos GTAHUB

## 1. Marcaje de Servicio Individual
- [ ] Crear tabla `servicios` en la base de datos: id, discord_user_id, nombre_usuario, fecha_inicio, fecha_fin, clientes_atendidos, comentario.
- [ ] Mensaje persistente en el canal de cada mecánico con botones "Iniciar Servicio" y "Finalizar Servicio".
- [ ] Guardar inicio y fin de servicio, clientes y comentario.
- [ ] Mostrar estado actual, historial y ranking personal en el mensaje persistente.
- [ ] Actualizar automáticamente el mensaje cada minuto.

## 2. Comando `contratar`

### Sub-tareas para el comando `contratar`
- [ ] Verificar si el canal de texto del mecánico ya existe.
- [ ] Crear canal de texto con permisos adecuados si no existe.
- [ ] Agregar roles de Gerente, RRHH, Jefe de taller y al usuario contratado.
- [ ] Asignar rol de Miembro y Ayudante (solo si no los tiene).
- [ ] Enviar mensaje de bienvenida fancy y carismático con emoticonos.
- [ ] Crear el mensaje persistente de marcaje en el canal del mecánico.

## 3. Comando `despedir`
- [ ] Mover el canal del mecánico a la categoría de despidos.
- [ ] Quitar rol de Miembro y Ayudante al usuario despedido.

---

## Ideas para el mensaje de bienvenida

- Usa emojis de herramientas, autos y celebración: 🛠️ 🚗 🎉
- Mensaje ejemplo:
  ```
  🎉 ¡Bienvenido a la familia de mecánicos, [usuario]! 🚗🛠️
  Tu canal personal está listo para que marques tus servicios y destaques como el mejor del taller.
  Si tienes dudas, pregunta a tu Jefe de Taller o RRHH. ¡Mucho éxito y a romperla! 💪
  ```
- Embed con color temático GTAHUB y foto de mecánicos.

---

## Siguiente paso

¿Con cuál funcionalidad quieres comenzar?
- [ ] Marcaje de servicio individual
- [ ] Comando contratar
- [