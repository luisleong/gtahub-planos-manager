import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    TextChannel,
    PermissionFlagsBits,
    Collection,
    Message
} from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

export const data = new SlashCommandBuilder()
    .setName('setup-canal-persistente')
    .setDescription('Configura mensajes persistentes para cada localización en este canal');

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const dbManager = new DatabaseManager();
        await interaction.deferReply({ ephemeral: true });

        const localizaciones = await dbManager.obtenerLocalizaciones();
        if (localizaciones.length === 0) {
            await interaction.editReply({
                content: '❌ No hay localizaciones registradas. Usa `/agregar-localizacion` primero.'
            });
            return;
        }

        const canal = interaction.channel as TextChannel;
        if (!canal) {
            await interaction.editReply({
                content: '❌ No se pudo acceder al canal.'
            });
            return;
        }

        // Verificar permisos del bot
        const botMember = await interaction.guild?.members.fetch(interaction.client.user.id);
        if (!botMember?.permissionsIn(canal).has([
            PermissionFlagsBits.SendMessages, 
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ManageMessages
        ])) {
            await interaction.editReply({
                content: '❌ El bot no tiene permisos suficientes en este canal. Necesita permisos para Ver Canal, Enviar Mensajes y Gestionar Mensajes.'
            });
            return;
        }

        // Limpiar mensajes existentes del canal
        let mensajesBorrados = 0;
        try {
            await interaction.editReply({
                content: '🧹 Limpiando canal... (esto puede tomar unos segundos)'
            });

            // Obtener todos los mensajes del canal en lotes de 100
            let ultimoMensajeId: string | undefined;
            let hayMasMensajes = true;

            while (hayMasMensajes) {
                const opciones: any = { limit: 100 };
                if (ultimoMensajeId) {
                    opciones.before = ultimoMensajeId;
                }

                const resultado = await canal.messages.fetch(opciones);
                
                // Verificar si el resultado es una Collection o un Message único
                let mensajes: Collection<string, Message>;
                if (resultado instanceof Collection) {
                    mensajes = resultado;
                } else {
                    // Si es un mensaje único, crear una Collection con ese mensaje
                    mensajes = new Collection();
                    mensajes.set(resultado.id, resultado);
                }
                
                if (mensajes.size === 0) {
                    hayMasMensajes = false;
                    break;
                }

                // Separar mensajes por edad (Discord no permite borrar mensajes de más de 14 días en lote)
                const ahora = Date.now();
                const dosSemanas = 14 * 24 * 60 * 60 * 1000; // 14 días en ms
                
                const mensajesRecientes = mensajes.filter((msg: Message) => 
                    (ahora - msg.createdTimestamp) < dosSemanas
                );
                const mensajesAntiguos = mensajes.filter((msg: Message) => 
                    (ahora - msg.createdTimestamp) >= dosSemanas
                );

                // Borrar mensajes recientes en lote (más eficiente)
                if (mensajesRecientes.size > 0) {
                    if (mensajesRecientes.size === 1) {
                        await mensajesRecientes.first()?.delete();
                    } else {
                        await canal.bulkDelete(mensajesRecientes, true);
                    }
                    mensajesBorrados += mensajesRecientes.size;
                }

                // Borrar mensajes antiguos uno por uno
                for (const mensaje of mensajesAntiguos.values()) {
                    try {
                        await mensaje.delete();
                        mensajesBorrados++;
                        // Pequeña pausa para evitar rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        console.warn(`No se pudo borrar mensaje antiguo ${mensaje.id}:`, error);
                    }
                }

                ultimoMensajeId = mensajes.last()?.id;
                
                // Si obtuvimos menos de 100 mensajes, ya no hay más
                if (mensajes.size < 100) {
                    hayMasMensajes = false;
                }

                // Pequeña pausa entre lotes
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            console.log(`✅ Se borraron ${mensajesBorrados} mensajes del canal ${canal.name}`);

        } catch (error) {
            console.error('Error limpiando canal:', error);
            await interaction.editReply({
                content: '⚠️ Hubo problemas al limpiar el canal, pero continuando con la configuración...'
            });
        }

        // Limpiar IDs de mensajes persistentes en la base de datos
        for (const loc of localizaciones) {
            await dbManager.limpiarMensajePersistente(loc.id);
        }

        await interaction.editReply({
            content: `🧹 Canal limpiado (${mensajesBorrados} mensajes borrados)\n📝 Creando mensajes persistentes...`
        });

        let mensajesCreados = 0;

        // Crear un mensaje persistente para cada localización
        for (const loc of localizaciones) {
            try {
                // Obtener estado actual de la localización
                const fabricaciones = await dbManager.obtenerFabricaciones();
                const fabricacionesActivas = fabricaciones.filter((f: any) => 
                    f.id_localizacion === loc.id && !f.recogido
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

                // Crear embed
                const embed = new EmbedBuilder()
                    .setTitle(`🏗️ ${loc.nombre.toUpperCase()}`)
                    .setDescription(`${estadoTexto}\n${estadoDescripcion}`)
                    .setColor(color)
                    .setImage(loc.foto_url || null)
                    .setFooter({ text: 'GTAHUB Planos Manager • Actualización automática' })
                    .setTimestamp();

                // Crear botones
                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`poner_persistente_${loc.id}`)
                            .setLabel('📋 Poner Planos')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(tieneEnProceso || tieneCompletado),
                        new ButtonBuilder()
                            .setCustomId(`recoger_persistente_${loc.id}`)
                            .setLabel('✅ Recoger Planos')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(!tieneCompletado)
                    );

                // Enviar mensaje persistente
                const mensaje = await canal.send({
                    embeds: [embed],
                    components: [row]
                });

                // Guardar el ID del mensaje en la base de datos para futuras actualizaciones
                await dbManager.actualizarMensajePersistente(loc.id, mensaje.id, canal.id);

                mensajesCreados++;

            } catch (error) {
                console.error(`Error creando mensaje para ${loc.nombre}:`, error);
            }
        }

        await interaction.editReply({
            content: `✅ **Canal configurado exitosamente**\n📨 Se crearon ${mensajesCreados} mensajes persistentes\n🔄 Los mensajes se actualizarán automáticamente cuando cambien los estados`
        });

    } catch (error) {
        console.error('Error en setup-canal-persistente:', error);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Error al configurar el canal persistente.',
                ephemeral: true
            });
        } else {
            await interaction.editReply({
                content: '❌ Error al configurar el canal persistente.'
            });
        }
    }
}
