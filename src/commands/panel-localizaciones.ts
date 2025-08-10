/*
import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    EmbedBuilder,
    ComponentType,
    StringSelectMenuBuilder
} from 'discord.js';
import { DatabaseManager, Localizacion, FabricacionCompleta } from '../database/DatabaseManager';

export const data = new SlashCommandBuilder()
    .setName('panel-localizaciones')
    .setDescription('Muestra el panel visual de todas las localizaciones con botones interactivos');

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const dbManager = new DatabaseManager();
        const localizaciones = await dbManager.obtenerLocalizaciones();
        const fabricaciones = await dbManager.obtenerFabricaciones();

        if (localizaciones.length === 0) {
            await interaction.reply({
                content: '❌ No hay localizaciones registradas. Usa `/agregar-localizacion` para añadir una.',
                ephemeral: true
            });
            return;
        }

        // Crear embeds y components limitando a máximo 5 localizaciones por mensaje
        const embeds = [];
        const components = [];

        // Discord permite máximo 5 ActionRows por mensaje
        const maxLocalizacionesPorMensaje = 5;

        for (let i = 0; i < Math.min(localizaciones.length, maxLocalizacionesPorMensaje); i++) {
            const loc = localizaciones[i];
            
            // Buscar fabricaciones activas en esta localización
            const fabricacionesActivas = fabricaciones.filter((f: FabricacionCompleta) => 
                f.id_localizacion === loc.id && !f.recogido
            );

            const tieneEnProceso = fabricacionesActivas.some((f: FabricacionCompleta) => !f.listo_para_recoger);
            const tieneCompletado = fabricacionesActivas.some((f: FabricacionCompleta) => f.listo_para_recoger);

            // Determinar estado y color
            let estadoTexto = '🟢 Disponible';
            let color = 0x57F287; // Verde
            
            if (tieneCompletado) {
                estadoTexto = '🔵 Planos listos';
                color = 0x5865F2; // Azul
            } else if (tieneEnProceso) {
                estadoTexto = '🟡 En proceso';
                color = 0xFEE75C; // Amarillo
            }

            const embed = new EmbedBuilder()
                .setTitle(loc.nombre.toUpperCase())
                .setDescription(`**LOCALIZACIÓN**\n\n${estadoTexto}`)
                .setColor(color)
                .setImage(loc.foto_url || '')
                .setFooter({ text: 'GTAHUB Planos Manager' })
                .setTimestamp();

            embeds.push(embed);

            // Crear botones para esta localización
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poner_planos_${loc.id}`)
                        .setLabel('Poner Planos')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📋')
                        .setDisabled(tieneEnProceso || tieneCompletado),
                    new ButtonBuilder()
                        .setCustomId(`recoger_planos_${loc.id}`)
                        .setLabel('Recoger Planos')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅')
                        .setDisabled(!tieneCompletado)
                );

            components.push(row);
        }

        // Enviar mensaje con las primeras 5 localizaciones máximo
        await interaction.reply({
            embeds: embeds,
            components: components
        });

        // Si hay más localizaciones, mostrar mensaje informativo
        if (localizaciones.length > maxLocalizacionesPorMensaje) {
            await interaction.followUp({
                content: `ℹ️ Mostrando las primeras ${maxLocalizacionesPorMensaje} localizaciones de ${localizaciones.length} total. Usa otros comandos para gestionar el resto.`,
                ephemeral: true
            });
        }

        // Configurar collector para manejar los botones
        const filter = (i: any) => i.user.id === interaction.user.id;
        const collector = interaction.channel?.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter,
            time: 300000 // 5 minutos
        });

        collector?.on('collect', async (buttonInteraction) => {
            const [action, , locId] = buttonInteraction.customId.split('_');
            const localizacionId = parseInt(locId);

            if (action === 'poner') {
                // Lógica para poner planos - mostrar selección de planos
                const planos = await dbManager.obtenerPlanos();
                
                if (planos.length === 0) {
                    await buttonInteraction.reply({
                        content: '❌ No hay planos disponibles. Usa `/agregar-plano` para añadir uno.',
                        ephemeral: true
                    });
                    return;
                }

                // Crear menú de selección de planos
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_plano_${localizacionId}`)
                    .setPlaceholder('Selecciona el plano a fabricar')
                    .addOptions(
                        planos.map((plano: any) => ({
                            label: plano.nombre,
                            description: `${plano.duracion_minutos} minutos de fabricación`,
                            value: plano.id.toString(),
                            emoji: '📋'
                        }))
                    );

                const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(selectMenu);

                await buttonInteraction.reply({
                    content: '📋 **Selecciona el plano que quieres fabricar:**',
                    components: [selectRow],
                    ephemeral: true
                });

            } else if (action === 'recoger') {
                // Lógica para recoger planos
                const fabricacionesCompletadas = fabricaciones.filter((f: FabricacionCompleta) => 
                    f.id_localizacion === localizacionId && f.listo_para_recoger && !f.recogido
                );

                if (fabricacionesCompletadas.length === 0) {
                    await buttonInteraction.reply({
                        content: '❌ No hay planos completados para recoger en esta localización.',
                        ephemeral: true
                    });
                    return;
                }

                // Marcar todas las fabricaciones como recogidas
                for (const fab of fabricacionesCompletadas) {
                    await dbManager.marcarComoRecogido(fab.id);
                }

                const embed = new EmbedBuilder()
                    .setTitle('✅ Planos recogidos')
                    .setDescription(`Has recogido **${fabricacionesCompletadas.length}** plano(s) de la localización.`)
                    .setColor(0x57F287)
                    .setTimestamp();

                await buttonInteraction.reply({
                    embeds: [embed],
                    ephemeral: true
                });

                // Refrescar el panel
                setTimeout(async () => {
                    await execute(interaction);
                }, 1000);
            }
        });

        collector?.on('end', () => {
            // Desactivar botones después del timeout
            console.log('Panel de localizaciones - Collector terminado');
        });

    } catch (error) {
        console.error('Error en panel-localizaciones:', error);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Error al mostrar el panel de localizaciones.',
                ephemeral: true
            });
        }
    }
}
*/
import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    EmbedBuilder,
    ComponentType,
    StringSelectMenuBuilder
} from 'discord.js';
import { DatabaseManager, Localizacion, FabricacionCompleta } from '../database/DatabaseManager';

export const data = new SlashCommandBuilder()
    .setName('panel-localizaciones')
    .setDescription('Muestra el panel visual de todas las localizaciones con botones interactivos');

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const dbManager = new DatabaseManager();
        const localizaciones = await dbManager.obtenerLocalizaciones();
        const fabricaciones = await dbManager.obtenerFabricaciones();

        if (localizaciones.length === 0) {
            await interaction.reply({
                content: '❌ No hay localizaciones registradas. Usa `/agregar-localizacion` para añadir una.',
                ephemeral: true
            });
            return;
        }

        // Crear embeds y components limitando a máximo 5 localizaciones por mensaje
        const embeds = [];
        const components = [];

        // Discord permite máximo 5 ActionRows por mensaje
        const maxLocalizacionesPorMensaje = 5;

        for (let i = 0; i < Math.min(localizaciones.length, maxLocalizacionesPorMensaje); i++) {
            const loc = localizaciones[i];
            
            // Buscar fabricaciones activas en esta localización
            const fabricacionesActivas = fabricaciones.filter((f: FabricacionCompleta) => 
                f.id_localizacion === loc.id && !f.recogido
            );

            const tieneEnProceso = fabricacionesActivas.some((f: FabricacionCompleta) => !f.listo_para_recoger);
            const tieneCompletado = fabricacionesActivas.some((f: FabricacionCompleta) => f.listo_para_recoger);

            // Determinar estado y color
            let estadoTexto = '🟢 Disponible';
            let color = 0x57F287; // Verde
            
            if (tieneCompletado) {
                estadoTexto = '🔵 Planos listos';
                color = 0x5865F2; // Azul
            } else if (tieneEnProceso) {
                estadoTexto = '🟡 En proceso';
                color = 0xFEE75C; // Amarillo
            }

            const embed = new EmbedBuilder()
                .setTitle(loc.nombre.toUpperCase())
                .setDescription(`**LOCALIZACIÓN**\n\n${estadoTexto}`)
                .setColor(color)
                .setImage(loc.foto_url || '')
                .setFooter({ text: 'GTAHUB Planos Manager' })
                .setTimestamp();

            embeds.push(embed);

            // Crear botones para esta localización
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poner_planos_${loc.id}`)
                        .setLabel('Poner Planos')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📋')
                        .setDisabled(tieneEnProceso || tieneCompletado),
                    new ButtonBuilder()
                        .setCustomId(`recoger_planos_${loc.id}`)
                        .setLabel('Recoger Planos')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅')
                        .setDisabled(!tieneCompletado)
                );

            components.push(row);
        }

        // Enviar mensaje con las primeras 5 localizaciones máximo
        await interaction.reply({
            embeds: embeds,
            components: components
        });

        // Si hay más localizaciones, mostrar mensaje informativo
        if (localizaciones.length > maxLocalizacionesPorMensaje) {
            await interaction.followUp({
                content: `ℹ️ Mostrando las primeras ${maxLocalizacionesPorMensaje} localizaciones de ${localizaciones.length} total. Usa otros comandos para gestionar el resto.`,
                ephemeral: true
            });
        }

        // Configurar collector para manejar los botones
        const filter = (i: any) => i.user.id === interaction.user.id;
        const collector = interaction.channel?.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter,
            time: 300000 // 5 minutos
        });

        collector?.on('collect', async (buttonInteraction) => {
            const [action, , locId] = buttonInteraction.customId.split('_');
            const localizacionId = parseInt(locId);

            if (action === 'poner') {
                // Lógica para poner planos - mostrar selección de planos
                const planos = await dbManager.obtenerPlanos();
                
                if (planos.length === 0) {
                    await buttonInteraction.reply({
                        content: '❌ No hay planos disponibles. Usa `/agregar-plano` para añadir uno.',
                        ephemeral: true
                    });
                    return;
                }

                // Crear menú de selección de planos
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_plano_${localizacionId}`)
                    .setPlaceholder('Selecciona el plano a fabricar')
                    .addOptions(
                        planos.map((plano: any) => ({
                            label: plano.nombre,
                            description: `${plano.duracion_minutos} minutos de fabricación`,
                            value: plano.id.toString(),
                            emoji: '📋'
                        }))
                    );

                const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(selectMenu);

                await buttonInteraction.reply({
                    content: '📋 **Selecciona el plano que quieres fabricar:**',
                    components: [selectRow],
                    ephemeral: true
                });

            } else if (action === 'recoger') {
                // Lógica para recoger planos
                const fabricacionesCompletadas = fabricaciones.filter((f: FabricacionCompleta) => 
                    f.id_localizacion === localizacionId && f.listo_para_recoger && !f.recogido
                );

                if (fabricacionesCompletadas.length === 0) {
                    await buttonInteraction.reply({
                        content: '❌ No hay planos completados para recoger en esta localización.',
                        ephemeral: true
                    });
                    return;
                }

                // Marcar todas las fabricaciones como recogidas
                for (const fab of fabricacionesCompletadas) {
                    await dbManager.marcarComoRecogido(fab.id);
                }

                const embed = new EmbedBuilder()
                    .setTitle('✅ Planos recogidos')
                    .setDescription(`Has recogido **${fabricacionesCompletadas.length}** plano(s) de la localización.`)
                    .setColor(0x57F287)
                    .setTimestamp();

                await buttonInteraction.reply({
                    embeds: [embed],
                    ephemeral: true
                });

                // Refrescar el panel
                setTimeout(async () => {
                    await execute(interaction);
                }, 1000);
            }
        });

        collector?.on('end', () => {
            // Desactivar botones después del timeout
            console.log('Panel de localizaciones - Collector terminado');
        });

    } catch (error) {
        console.error('Error en panel-localizaciones:', error);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Error al mostrar el panel de localizaciones.',
                ephemeral: true
            });
        }
    }
}
