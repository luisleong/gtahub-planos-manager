import { Client, TextChannel } from 'discord.js';
import { crearCardNotificacion } from './embeds';
import { FabricacionCompleta } from '../database/DatabaseManager';

export class NotificationManager {
    private client: Client;
    private intervalId: NodeJS.Timeout | null = null;
    private readonly INTERVAL_MINUTES = 5; // Revisar cada 5 minutos

    constructor(client: Client) {
        this.client = client;
    }

    /**
     * Iniciar el sistema de notificaciones automáticas
     */
    public iniciar(): void {
        if (this.intervalId) {
            console.log('⚠️ Sistema de notificaciones ya está ejecutándose');
            return;
        }

        console.log(`🔔 Iniciando sistema de notificaciones (cada ${this.INTERVAL_MINUTES} minutos)`);
        
        this.intervalId = setInterval(async () => {
            await this.verificarFabricacionesCompletadas();
        }, this.INTERVAL_MINUTES * 60 * 1000);

        // Ejecutar inmediatamente también
        this.verificarFabricacionesCompletadas();
    }

    /**
     * Detener el sistema de notificaciones
     */
    public detener(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🔕 Sistema de notificaciones detenido');
        }
    }

    /**
     * Verificar fabricaciones que deberían estar completadas y enviar notificaciones
     */
    private async verificarFabricacionesCompletadas(): Promise<void> {
        try {
            // Obtener fabricaciones que deberían estar listas
            const fabricacionesListas = await this.client.db.obtenerFabricacionesParaNotificar();

            if (fabricacionesListas.length === 0) {
                return; // No hay fabricaciones listas
            }

            console.log(`🔔 Procesando ${fabricacionesListas.length} fabricación(es) completada(s)`);

            for (const fabricacion of fabricacionesListas) {
                await this.procesarFabricacionCompletada(fabricacion);
            }

        } catch (error) {
            console.error('❌ Error verificando fabricaciones completadas:', error);
        }
    }

    /**
     * Procesar una fabricación que se ha completado
     */
    private async procesarFabricacionCompletada(fabricacion: FabricacionCompleta): Promise<void> {
        try {
            // Marcar como listo para recoger
            await this.client.db.marcarComoListo(fabricacion.id);

            // Enviar notificación
            await this.enviarNotificacion(fabricacion);

            console.log(`✅ Fabricación completada y notificada: ID ${fabricacion.id}, ${fabricacion.plano_nombre}`);

        } catch (error) {
            console.error(`❌ Error procesando fabricación completada ID ${fabricacion.id}:`, error);
        }
    }

    /**
     * Enviar notificación de fabricación lista
     */
    private async enviarNotificacion(fabricacion: FabricacionCompleta): Promise<void> {
        try {
            // Determinar canal donde enviar la notificación
            let canalId = fabricacion.canal_notificacion;
            
            // Si no hay canal específico, usar canal por defecto del .env
            if (!canalId && process.env.NOTIFICATION_CHANNEL_ID) {
                canalId = process.env.NOTIFICATION_CHANNEL_ID;
            }

            if (!canalId) {
                console.log(`⚠️ No hay canal de notificación configurado para fabricación ID ${fabricacion.id}`);
                return;
            }

            // Obtener canal
            const canal = await this.client.channels.fetch(canalId) as TextChannel;
            
            if (!canal || !canal.isTextBased()) {
                console.error(`❌ Canal de notificación no válido: ${canalId}`);
                return;
            }

            // Crear embed de notificación
            const embed = crearCardNotificacion(fabricacion);

            // Enviar notificación
            await canal.send({
                content: `🔔 <@${fabricacion.propietario_id}> ¡Tu plano está listo para recoger!`,
                embeds: [embed]
            });

            console.log(`📬 Notificación enviada para fabricación ID ${fabricacion.id} al canal ${canal.name}`);

        } catch (error) {
            console.error(`❌ Error enviando notificación para fabricación ID ${fabricacion.id}:`, error);
        }
    }

    /**
     * Enviar notificación manual (para pruebas o uso específico)
     */
    public async enviarNotificacionManual(fabricacionId: number, canalId: string): Promise<boolean> {
        try {
            const fabricacion = await this.client.db.obtenerFabricacionPorId(fabricacionId);
            
            if (!fabricacion) {
                console.error(`❌ Fabricación ID ${fabricacionId} no encontrada`);
                return false;
            }

            const canal = await this.client.channels.fetch(canalId) as TextChannel;
            
            if (!canal || !canal.isTextBased()) {
                console.error(`❌ Canal ${canalId} no válido`);
                return false;
            }

            const embed = crearCardNotificacion(fabricacion);

            await canal.send({
                content: `🔔 <@${fabricacion.propietario_id}> Notificación manual de fabricación:`,
                embeds: [embed]
            });

            console.log(`📬 Notificación manual enviada para fabricación ID ${fabricacionId}`);
            return true;

        } catch (error) {
            console.error(`❌ Error enviando notificación manual:`, error);
            return false;
        }
    }

    /**
     * Obtener estadísticas del sistema de notificaciones
     */
    public getEstado(): { activo: boolean; intervaloMinutos: number } {
        return {
            activo: this.intervalId !== null,
            intervaloMinutos: this.INTERVAL_MINUTES
        };
    }
}
