# Checklist para Sistema de Cobro Semanal GTAHUB

## Pasos técnicos para implementar el sistema

- [ ] **Diseñar la base de datos**
  - Crear tabla `payments` con: id, discord_user_id, nombre_usuario, monto, estado, fecha_pago, comentario.
- [ ] **Detectar usuarios con el rol @Miembro**
  - Usar la API de Discord para obtener todos los usuarios con el rol específico.
- [ ] **Programar el cron de cobro semanal**
  - Ejecutar todos los sábados a las 23:59.
  - Crear registros de pago pendientes para cada usuario con el rol.
- [ ] **Enviar mensaje persistente de cobro**
  - Mensaje en canal dedicado con embed visual, listado de usuarios y estado de pago.
  - Botón para marcar pago realizado y para agregar comentario.
- [ ] **Actualizar estado de pago**
  - Cambiar estado a "Pagado" cuando el usuario marca el pago.
  - Permitir agregar comentario (ej: método de pago, referencia).
- [ ] **Notificar a usuarios**
  - Mencionar a todos los usuarios con pago pendiente.
  - Opcional: enviar DM de recordatorio.
- [ ] **Historial y administración**
  - Permitir ver historial de pagos por usuario.
  - Comando para admins para ajustar pagos manualmente.
- [ ] **Manejo de errores y logs**
  - Validar duplicados, errores de Discord, pagos fuera de fecha, etc.

---

## Ideas para el UI del mensaje persistente

- Embed con color temático GTAHUB y título "Cobro Semanal"
- Lista de usuarios con estado:
  - 🟢 Pagado
  - 🟡 Pendiente
  - 🔴 Retrasado
- Botón "Marcar como pagado" (solo para el propio usuario)
- Botón "Agregar comentario" (modal para referencia de pago)
- Sección con monto y fecha límite
- Contador de pagos realizados y pendientes
- Mensaje de advertencia si hay retrasados
- Historial de pagos (últimas 4 semanas) en un dropdown o sección aparte
- Notificación automática en el canal y/o DM
- Comando `/setup-canal-cobros` para inicializar el mensaje persistente

---

## Ejemplo visual del embed

```
**Cobro Semanal**
Monto: $5000 | Fecha límite: Sábado 23:59

🟡 Juan Pérez (Pendiente)
🟢 Maria Gómez (Pagado)
🔴 El Chino (Retrasado)

[Marcar como pagado] [Agregar comentario]

Pagos realizados: 12 / 20
Retrasados: 3
```

---

¿Quieres que te ayude a definir la estructura de la base de datos o el flujo de comandos