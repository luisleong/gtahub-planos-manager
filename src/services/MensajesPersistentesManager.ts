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
import { getFabricacionProgress } from '../utils/progressBar';

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

            console.log(`🔍 DEBUG MensajesPersistentes: Localizacion ${localizacionId} (${localizacion.nombre})`);
            console.log(`🔍 DEBUG: Fabricaciones activas encontradas: ${fabricacionesActivas.length}`);
            fabricacionesActivas.forEach((f: any) => {
                console.log(`   - ID: ${f.id}, Plano: ${f.plano_nombre}, Propietario: ${f.propietario}, listo_para_recoger: ${f.listo_para_recoger}, recogido: ${f.recogido}`);
            });

            const tieneEnProceso = fabricacionesActivas.some((f: any) => !f.listo_para_recoger);
            // SEPARAR LÓGICAS: 
            // - tieneCompletado: Para BOTONES (cualquier fabricación lista)
            // - tieneCompletadoSinNotificar: Para NOTIFICACIONES (solo las no notificadas)
            const tieneCompletado = fabricacionesActivas.some((f: any) => f.listo_para_recoger);
            const tieneCompletadoSinNotificar = fabricacionesActivas.some((f: any) => f.listo_para_recoger && !f.notificado);

            console.log(`🔍 DEBUG: tieneEnProceso = ${tieneEnProceso}, tieneCompletado = ${tieneCompletado}`);
            console.log(`🔍 DEBUG: tieneCompletadoSinNotificar = ${tieneCompletadoSinNotificar}`);
            console.log(`🔍 DEBUG: Fabricaciones listas pero no notificadas: ${fabricacionesActivas.filter((f: any) => f.listo_para_recoger && !f.notificado).length}`);

            // Determinar estado y color
            let estadoTexto = '🟢 **DISPONIBLE**';
            let estadoDescripcion = 'Lista para colocar planos';
            let color = 0x57F287; // Verde
            let progressInfo = '';
            let tituloConEstado = `🏗️ ${localizacion.nombre.toUpperCase()}`;
            
            if (tieneCompletado) {
                estadoTexto = '🔵 **PLANOS LISTOS**';
                estadoDescripcion = '¡Listos para recoger!';
                color = 0x5865F2; // Azul
                tituloConEstado = `🏗️ ${localizacion.nombre.toUpperCase()} • 🔵 PLANOS LISTOS`;
                
                // Mostrar información de planos completados
                const completados = fabricacionesActivas.filter((f: any) => f.listo_para_recoger);
                progressInfo = completados.map((f: any) => 
                    `✅ **${f.plano_nombre}** • ${f.propietario}`
                ).join('\n');
                                
            } else if (tieneEnProceso) {
                estadoTexto = '🟡 **EN PROCESO**';
                estadoDescripcion = '';
                color = 0xFEE75C; // Amarillo
                tituloConEstado = `🏗️ ${localizacion.nombre.toUpperCase()} • 🟡 EN PROCESO`;
                
                // Mostrar barras de progreso para planos en proceso
                const enProceso = fabricacionesActivas.filter((f: any) => !f.listo_para_recoger);
                console.log(`🔍 DEBUG: Fabricaciones en proceso encontradas: ${enProceso.length}`);
                
                progressInfo = enProceso.map((f: any) => {
                    console.log(`🔍 DEBUG: Procesando fabricación ${f.id} - ${f.plano_nombre}`);
                    console.log(`🔍 DEBUG: timestamp_colocacion: ${f.timestamp_colocacion}`);
                    console.log(`🔍 DEBUG: plano_duracion: ${f.plano_duracion}`);
                    
                    const progress = getFabricacionProgress(f.timestamp_colocacion, f.plano_duracion);
                    
                    return [
                        `🔨 **${f.plano_nombre}** • ${f.propietario}`,
                        `${progress.progressBar} ${progress.percentage}%`,
                        `⏱️ ${progress.timeRemainingText} restante`
                    ].join('\n');
                }).join('\n\n');
            }

            // Si hay planos completados que no han sido notificados y se debe notificar
            if (tieneCompletadoSinNotificar && notificarSiListo) {
                // Obtener las fabricaciones que necesitan notificación
                const fabricacionesParaNotificar = fabricacionesActivas.filter((f: any) => f.listo_para_recoger && !f.notificado);
                
                // Enviar notificación @everyone
                await canal.send({
                    content: `@everyone 🔔 **PLANOS LISTOS EN ${localizacion.nombre.toUpperCase()}**`,
                    allowedMentions: { parse: ['everyone'] }
                });

                // IMPORTANTE: Marcar todas estas fabricaciones como notificadas para evitar spam futuro
                for (const fabricacion of fabricacionesParaNotificar) {
                    try {
                        await this.dbManager.marcarComoNotificado(fabricacion.id);
                        console.log(`✅ Fabricación ${fabricacion.id} marcada como notificada desde MensajesPersistentes`);
                    } catch (error) {
                        console.error(`❌ Error marcando fabricación ${fabricacion.id} como notificada:`, error);
                    }
                }
            }

            // Actualizar embed
            const ahora = new Date();
            const fechaFormateada = ahora.toLocaleString('es-ES', { 
                timeZone: 'Europe/Madrid',
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            // Construir descripción con timestamp siempre presente
            let descripcionCompleta = '';
            if (estadoDescripcion) {
                descripcionCompleta = `${estadoDescripcion}\n\n`;
            }
            descripcionCompleta += `📅 **Actualizado el:** ${fechaFormateada}`;

            const embed = new EmbedBuilder()
                .setTitle(tituloConEstado)
                .setDescription(descripcionCompleta)
                .setColor(color)
                .setImage(localizacion.foto_url || null)
                .setFooter({ text: 'GTAHUB Planos Manager • Actualización automática' })
                .setTimestamp();

            // Solo agregar campo de progresso si hay información y no mostrar título redundante
            if (progressInfo) {
                embed.addFields({
                    name: tieneCompletado ? '📦 Planos Completados' : 'Progreso de Fabricación',
                    value: progressInfo,
                    inline: false
                });
            }

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
