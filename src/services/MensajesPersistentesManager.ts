import { 
    Client, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    TextChannel,
    Message
} from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

export class MensajesPersistentesManager {
    private client: Client;
    private dbManager: DatabaseManager;

    constructor(client: Client) {
        this.client = client;
        this.dbManager = new DatabaseManager();
    }

    /**
     * Actualizar el mensaje persistente de una localización específica
     */
    async actualizarMensajeLocalizacion(localizacionId: number, notificarSiListo: boolean = false): Promise<void> {
        try {
            const localizaciones = await this.dbManager.obtenerTodasLasLocalizaciones();
            const localizacion = localizaciones.find((l: any) => l.id === localizacionId);

            if (!localizacion || !localizacion.mensaje_persistente_id || !localizacion.canal_persistente_id) {
                console.log(`⚠️ Localización ${localizacionId} no tiene mensaje persistente configurado`);
                return;
            }

            // Obtener el canal y mensaje
            const canal = await this.client.channels.fetch(localizacion.canal_persistente_id) as TextChannel;
            if (!canal) {
                console.error(`❌ No se pudo encontrar el canal ${localizacion.canal_persistente_id}`);
                return;
            }

            const mensaje = await canal.messages.fetch(localizacion.mensaje_persistente_id) as Message;
            if (!mensaje) {
                console.error(`❌ No se pudo encontrar el mensaje ${localizacion.mensaje_persistente_id}`);
                return;
            }

            // Obtener estado actual
            const fabricaciones = await this.dbManager.obtenerFabricaciones();
            const fabricacionesActivas = fabricaciones.filter((f: any) => 
                f.id_localizacion === localizacionId && !f.recogido
            );

            const tieneEnProceso = fabricacionesActivas.some((f: any) => !f.listo_para_recoger);
            const tieneCompletado = fabricacionesActivas.some((f: any) => f.listo_para_recoger);

            // Determinar estado y color
            let estadoTexto = '🟢 **DISPONIBLE**';
            let estadoDescripcion = 'Lista para colocar planos';
            let color = 0x57F287; // Verde
            
            if (tieneCompletado) {
                estadoTexto = '🔵 **PLANOS LISTOS**';
                estadoDescripcion = '¡Listos para recoger!';
                color = 0x5865F2; // Azul
            } else if (tieneEnProceso) {
                estadoTexto = '🟡 **EN PROCESO**';
                estadoDescripcion = 'Fabricando planos...';
                color = 0xFEE75C; // Amarillo
            }

            // Si hay planos completados y se debe notificar
            if (tieneCompletado && notificarSiListo) {
                // Enviar notificación @everyone
                await canal.send({
                    content: `@everyone 🔔 **PLANOS LISTOS EN ${localizacion.nombre.toUpperCase()}**`,
                    allowedMentions: { parse: ['everyone'] }
                });
            }

            // Actualizar embed
            const embed = new EmbedBuilder()
                .setTitle(`🏗️ ${localizacion.nombre.toUpperCase()}`)
                .setDescription(`${estadoTexto}\n${estadoDescripcion}`)
                .setColor(color)
                .setImage(localizacion.foto_url || null)
                .setFooter({ text: 'GTAHUB Planos Manager • Actualización automática' })
                .setTimestamp();

            // Actualizar botones
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poner_persistente_${localizacionId}`)
                        .setLabel('📋 Poner Planos')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(tieneEnProceso || tieneCompletado),
                    new ButtonBuilder()
                        .setCustomId(`recoger_persistente_${localizacionId}`)
                        .setLabel('✅ Recoger Planos')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(!tieneCompletado)
                );

            // Actualizar el mensaje
            await mensaje.edit({
                embeds: [embed],
                components: [row]
            });

            console.log(`✅ Mensaje actualizado para ${localizacion.nombre}`);

        } catch (error) {
            console.error(`❌ Error actualizando mensaje de localización ${localizacionId}:`, error);
        }
    }

    /**
     * Actualizar todos los mensajes persistentes
     */
    async actualizarTodosLosMensajes(): Promise<void> {
        try {
            const localizaciones = await this.dbManager.obtenerTodasLasLocalizaciones();
            
            for (const loc of localizaciones) {
                if (loc.mensaje_persistente_id && loc.canal_persistente_id) {
                    await this.actualizarMensajeLocalizacion(loc.id);
                    // Pequeña pausa para no sobrecargar la API
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            console.log('✅ Todos los mensajes persistentes actualizados');

        } catch (error) {
            console.error('❌ Error actualizando todos los mensajes:', error);
        }
    }
}

export default MensajesPersistentesManager;
