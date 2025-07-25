import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { crearCardFabricacion, COLORS } from '../utils/embeds';
import { Localizacion, Plano } from '../database/DatabaseManager';

export default {
    data: new SlashCommandBuilder()
        .setName('fabricar')
        .setDescription('🚀 Iniciar fabricación rápida con menús interactivos')
        .addUserOption(option =>
            option.setName('propietario')
                .setDescription('Usuario propietario (opcional, por defecto tú)')
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const propietario = interaction.options.getUser('propietario') || interaction.user;

            // Obtener localizaciones disponibles
            const localizaciones = await interaction.client.db.obtenerLocalizaciones();
            
            if (localizaciones.length === 0) {
                await interaction.editReply({
                    content: '❌ No hay localizaciones disponibles. Agrega algunas primero con `/agregar-localizacion`.'
                });
                return;
            }

            // Crear embed inicial
            const embed = new EmbedBuilder()
                .setTitle('🏗️ Nueva Fabricación Rápida')
                .setColor(COLORS.GTAHUB)
                .setDescription('**Paso 1/2:** Selecciona la localización donde fabricar')
                .addFields(
                    { name: '👤 Propietario', value: propietario.toString(), inline: true },
                    { name: '📍 Localizaciones', value: `${localizaciones.length} disponibles`, inline: true }
                )
                .setFooter({ text: 'Selecciona una localización del menú desplegable' })
                .setTimestamp();

            // Crear menú de localizaciones (máximo 25)
            const opcionesLocalizaciones = localizaciones.slice(0, 25).map((loc: Localizacion) => ({
                label: loc.nombre,
                description: `ID: ${loc.id} | Disponible para fabricación`,
                value: loc.id.toString(),
                emoji: '📍'
            }));

            const menuLocalizaciones = new StringSelectMenuBuilder()
                .setCustomId('fabricar_select_localizacion')
                .setPlaceholder('🏠 Selecciona una localización...')
                .addOptions(opcionesLocalizaciones);

            const rowLocalizaciones = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(menuLocalizaciones);

            const response = await interaction.editReply({
                embeds: [embed],
                components: [rowLocalizaciones]
            });

            // Collector para el menú de localizaciones
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 300000 // 5 minutos
            });

            collector.on('collect', async (selectInteraction) => {
                // Verificar que sea el usuario correcto
                if (selectInteraction.user.id !== interaction.user.id) {
                    await selectInteraction.reply({
                        content: '❌ Solo quien ejecutó el comando puede usar este menú.',
                        ephemeral: true
                    });
                    return;
                }

                if (selectInteraction.customId === 'fabricar_select_localizacion') {
                    await mostrarMenuPlanos(selectInteraction, parseInt(selectInteraction.values[0]), propietario);
                } else if (selectInteraction.customId === 'fabricar_select_plano') {
                    await crearFabricacionRapida(selectInteraction, propietario);
                }
            });

            collector.on('end', async () => {
                try {
                    const menuDeshabilitado = new StringSelectMenuBuilder()
                        .setCustomId('fabricar_select_localizacion_disabled')
                        .setPlaceholder('Menú expirado - Ejecuta el comando de nuevo')
                        .setDisabled(true)
                        .addOptions([{ label: 'Expirado', value: 'expired' }]);

                    const rowDeshabilitado = new ActionRowBuilder<StringSelectMenuBuilder>()
                        .addComponents(menuDeshabilitado);

                    await interaction.editReply({ components: [rowDeshabilitado] });
                } catch (error) {
                    // Ignorar errores si el mensaje ya fue eliminado
                }
            });

        } catch (error) {
            console.error('❌ Error en comando fabricar:', error);
            
            await interaction.editReply({
                content: '❌ Hubo un error iniciando la fabricación rápida.'
            });
        }
    },
};

/**
 * Mostrar menú de planos después de seleccionar localización
 */
async function mostrarMenuPlanos(interaction: any, localizacionId: number, propietario: any): Promise<void> {
    try {
        await interaction.deferUpdate();

        // Obtener planos disponibles
        const planos = await interaction.client.db.obtenerPlanos();
        
        if (planos.length === 0) {
            await interaction.editReply({
                content: '❌ No hay planos disponibles. Agrega algunos primero con `/agregar-plano`.',
                components: []
            });
            return;
        }

        // Obtener información de la localización seleccionada
        const localizacion = await interaction.client.db.obtenerLocalizacionPorId(localizacionId);

        // Crear embed para el segundo paso
        const embed = new EmbedBuilder()
            .setTitle('🏗️ Nueva Fabricación Rápida')
            .setColor(COLORS.GTAHUB)
            .setDescription('**Paso 2/2:** Selecciona el tipo de plano a fabricar')
            .addFields(
                { name: '👤 Propietario', value: propietario.toString(), inline: true },
                { name: '📍 Localización', value: `✅ ${localizacion?.nombre}`, inline: true },
                { name: '📋 Planos', value: `${planos.length} disponibles`, inline: true }
            )
            .setFooter({ text: 'Selecciona un plano del menú desplegable' })
            .setTimestamp();

        // Crear menú de planos (máximo 25)
        const opcionesPlanos = planos.slice(0, 25).map((plano: Plano) => {
            const duracionHoras = Math.floor(plano.duracion_minutos / 60);
            const duracionMinutos = plano.duracion_minutos % 60;
            let duracionTexto = '';
            
            if (duracionHoras > 0) {
                duracionTexto = `${duracionHoras}h ${duracionMinutos}m`;
            } else {
                duracionTexto = `${duracionMinutos}m`;
            }

            return {
                label: plano.nombre,
                description: `⏱️ Duración: ${duracionTexto} | ID: ${plano.id}`,
                value: `${localizacionId}_${plano.id}`, // Formato: localizacionId_planoId
                emoji: '📋'
            };
        });

        const menuPlanos = new StringSelectMenuBuilder()
            .setCustomId('fabricar_select_plano')
            .setPlaceholder('📋 Selecciona un tipo de plano...')
            .addOptions(opcionesPlanos);

        const rowPlanos = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(menuPlanos);

        await interaction.editReply({
            embeds: [embed],
            components: [rowPlanos]
        });

    } catch (error) {
        console.error('Error mostrando menú de planos:', error);
        await interaction.editReply({
            content: '❌ Error mostrando los planos disponibles.',
            components: []
        });
    }
}

/**
 * Crear la fabricación rápida después de seleccionar localización y plano
 */
async function crearFabricacionRapida(interaction: any, propietario: any): Promise<void> {
    try {
        await interaction.deferUpdate();

        // Parsear los IDs de localización y plano
        const [localizacionId, planoId] = interaction.values[0].split('_').map(Number);

        // Obtener información completa
        const localizacion = await interaction.client.db.obtenerLocalizacionPorId(localizacionId);
        const plano = await interaction.client.db.obtenerPlanoPorId(planoId);

        if (!localizacion || !plano) {
            await interaction.editReply({
                content: '❌ Error: Localización o plano no encontrado.',
                components: []
            });
            return;
        }

        // Crear la fabricación
        const fabricacionId = await interaction.client.db.crearFabricacion(
            localizacionId,
            planoId,
            propietario.displayName || propietario.username,
            propietario.id,
            undefined, // sin notas
            interaction.channelId
        );

        // Obtener fabricación completa para mostrar
        const fabricacion = await interaction.client.db.obtenerFabricacionPorId(fabricacionId);

        if (!fabricacion) {
            await interaction.editReply({
                content: '❌ Error al crear la fabricación.',
                components: []
            });
            return;
        }

        // Crear y mostrar card de éxito
        const embed = crearCardFabricacion(fabricacion);
        
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Fabricación Creada Exitosamente!')
            .setColor(COLORS.SUCCESS)
            .setDescription(`🚀 **${plano.nombre}** iniciado en **${localizacion.nombre}**`)
            .addFields(
                { name: '⏱️ Tiempo de Fabricación', value: `${plano.duracion_minutos} minutos`, inline: true },
                { name: '👤 Propietario', value: propietario.toString(), inline: true },
                { name: '🆔 ID de Fabricación', value: fabricacionId.toString(), inline: true }
            )
            .setFooter({ text: 'Recibirás una notificación cuando esté listo' })
            .setTimestamp();

        await interaction.editReply({
            content: `🎉 **¡Fabricación iniciada en un solo clic!**`,
            embeds: [successEmbed, embed],
            components: []
        });

        // Log para administración
        console.log(`🚀 Fabricación rápida creada: ID ${fabricacionId}, ${plano.nombre} en ${localizacion.nombre}, Usuario: ${propietario.tag}`);

    } catch (error) {
        console.error('Error creando fabricación rápida:', error);
        await interaction.editReply({
            content: '❌ Error al crear la fabricación.',
            components: []
        });
    }
}
