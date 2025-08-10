// ...existing code...
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { COLORS } from '../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('limpiar-base-datos')
        .setDescription('🧹 Herramientas de administración para limpiar la base de datos')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('tipo')
                .setDescription('Qué elementos eliminar')
                .setRequired(true)
                .addChoices(
                    { name: '🗑️ Solo Localizaciones', value: 'localizaciones' },
                    { name: '📋 Solo Planos', value: 'planos' },
                    { name: '🏭 Solo Fabricaciones', value: 'fabricaciones' },
                    { name: '🔥 Localizaciones + Planos', value: 'localizaciones_planos' },
                    { name: '⚠️ TODO (Excepto Fabricaciones)', value: 'todo_excepto_fabricaciones' },
                    { name: '💀 ELIMINAR TODO', value: 'nuclear' }
                )
        )
        .addBooleanOption(option =>
            option.setName('confirmar')
                .setDescription('¿Estás ABSOLUTAMENTE seguro? (Acción irreversible)')
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const tipo = interaction.options.getString('tipo', true);
            const confirmado = interaction.options.getBoolean('confirmar', true);

            if (!confirmado) {
                await interaction.editReply({
                    content: '❌ Debes confirmar la acción marcando `confirmar: True` para continuar.'
                });
                return;
            }

            // Verificar permisos de administrador
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                await interaction.editReply({
                    content: '❌ Solo los administradores pueden usar este comando.'
                });
                return;
            }

            // Crear embed de confirmación final
            const embed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('⚠️ CONFIRMACIÓN FINAL DE LIMPIEZA')
                .setDescription(`Estás a punto de ejecutar: **${obtenerDescripcionTipo(tipo)}**`)
                .addFields(
                    { name: '⚠️ ADVERTENCIA', value: 'Esta acción es **IRREVERSIBLE**', inline: false },
                    { name: '🕐 Tiempo límite', value: 'Tienes 30 segundos para confirmar', inline: true },
                    { name: '👤 Ejecutado por', value: interaction.user.toString(), inline: true }
                )
                .setFooter({ text: 'GTAHUB Planos Manager - Herramientas de Administración' })
                .setTimestamp();

            const botones = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ejecutar_limpieza_${tipo}`)
                        .setLabel('🗑️ SÍ, ELIMINAR')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancelar_limpieza')
                        .setLabel('❌ Cancelar')
                        .setStyle(ButtonStyle.Secondary)
                );

            const response = await interaction.editReply({
                embeds: [embed],
                components: [botones]
            });

            // Collector para los botones con timeout de 30 segundos
            const collector = response.createMessageComponentCollector({
                time: 30000
            });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    await buttonInteraction.reply({
                        content: '❌ Solo quien ejecutó el comando puede confirmar.',
                        ephemeral: true
                    });
                    return;
                }

                await buttonInteraction.deferUpdate();

                if (buttonInteraction.customId === 'cancelar_limpieza') {
                    const cancelEmbed = new EmbedBuilder()
                        .setColor(COLORS.INFO)
                        .setTitle('✅ Operación Cancelada')
                        .setDescription('La limpieza de base de datos fue cancelada.')
                        .setTimestamp();

                    await buttonInteraction.editReply({
                        embeds: [cancelEmbed],
                        components: []
                    });
                    collector.stop();
                    return;
                }

                if (buttonInteraction.customId.startsWith('ejecutar_limpieza_')) {
                    const tipoEjecutar = buttonInteraction.customId.replace('ejecutar_limpieza_', '');
                    await ejecutarLimpieza(buttonInteraction, tipoEjecutar);
                    collector.stop();
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(COLORS.WARNING)
                        .setTitle('⏰ Tiempo Agotado')
                        .setDescription('La confirmación expiró. La base de datos no fue modificada.')
                        .setTimestamp();

                    await interaction.editReply({
                        embeds: [timeoutEmbed],
                        components: []
                    });
                }
            });

        } catch (error) {
            console.error('❌ Error en comando limpiar-base-datos:', error);
            
            await interaction.editReply({
                content: '❌ Hubo un error ejecutando el comando de limpieza.'
            });
        }
    },
};

/**
 * Ejecutar la limpieza según el tipo seleccionado
 */
async function ejecutarLimpieza(interaction: any, tipo: string): Promise<void> {
    try {
        let resultados = {
            localizaciones: 0,
            planos: 0,
            fabricaciones: 0
        };

        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle('🔄 Ejecutando Limpieza...')
            .setDescription('Por favor espera mientras se limpia la base de datos.')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });

        switch (tipo) {
            case 'localizaciones':
                resultados.localizaciones = await limpiarLocalizaciones(interaction.client.db);
                break;

            case 'planos':
                resultados.planos = await limpiarPlanos(interaction.client.db);
                break;

            case 'fabricaciones':
                resultados.fabricaciones = await limpiarFabricaciones(interaction.client.db);
                break;

            case 'localizaciones_planos':
                resultados.localizaciones = await limpiarLocalizaciones(interaction.client.db);
                resultados.planos = await limpiarPlanos(interaction.client.db);
                break;

            case 'todo_excepto_fabricaciones':
                resultados.localizaciones = await limpiarLocalizaciones(interaction.client.db);
                resultados.planos = await limpiarPlanos(interaction.client.db);
                break;

            case 'nuclear':
                resultados.fabricaciones = await limpiarFabricaciones(interaction.client.db);
                resultados.localizaciones = await limpiarLocalizaciones(interaction.client.db);
                resultados.planos = await limpiarPlanos(interaction.client.db);
                break;
        }

        // Embed de resultado final
        const resultadoEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('✅ Limpieza Completada')
            .setDescription('La operación de limpieza se ejecutó correctamente.')
            .addFields(
                { name: '🗑️ Localizaciones Eliminadas', value: resultados.localizaciones.toString(), inline: true },
                { name: '📋 Planos Eliminados', value: resultados.planos.toString(), inline: true },
                { name: '🏭 Fabricaciones Eliminadas', value: resultados.fabricaciones.toString(), inline: true }
            )
            .setFooter({ text: `Ejecutado por ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [resultadoEmbed] });

        // Log para administración
        console.log(`🧹 Limpieza masiva ejecutada por ${interaction.user.tag}: ${tipo}`, resultados);

    } catch (error) {
        console.error('Error ejecutando limpieza:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('❌ Error en Limpieza')
            .setDescription('Ocurrió un error durante la limpieza. Algunos elementos pueden no haberse eliminado.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

/**
 * Limpiar todas las localizaciones
 */
async function limpiarLocalizaciones(db: any): Promise<number> {
    return new Promise((resolve, reject) => {
        db.db.run('DELETE FROM localizaciones', function(this: any, err: any) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes || 0);
            }
        });
    });
}

/**
 * Limpiar todos los planos
 */
async function limpiarPlanos(db: any): Promise<number> {
    return new Promise((resolve, reject) => {
        db.db.run('DELETE FROM planos', function(this: any, err: any) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes || 0);
            }
        });
    });
}

/**
 * Limpiar todas las fabricaciones
 */
async function limpiarFabricaciones(db: any): Promise<number> {
    return new Promise((resolve, reject) => {
        db.db.run('DELETE FROM fabricaciones', function(this: any, err: any) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes || 0);
            }
        });
    });
}

/**
 * Obtener descripción legible del tipo de limpieza
 */
function obtenerDescripcionTipo(tipo: string): string {
    switch (tipo) {
        case 'localizaciones':
            return 'Eliminar TODAS las localizaciones';
        case 'planos':
            return 'Eliminar TODOS los planos';
        case 'fabricaciones':
            return 'Eliminar TODAS las fabricaciones';
        case 'localizaciones_planos':
            return 'Eliminar TODAS las localizaciones Y planos';
        case 'todo_excepto_fabricaciones':
            return 'Eliminar TODO excepto fabricaciones';
        case 'nuclear':
            return 'ELIMINAR ABSOLUTAMENTE TODO';
        default:
            return 'Operación desconocida';
    }
}
