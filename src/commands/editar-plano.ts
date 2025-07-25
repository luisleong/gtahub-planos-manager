import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

const db = new DatabaseManager();

export const data = new SlashCommandBuilder()
    .setName('editar-plano')
    .setDescription('Editar un plano existente')
    .addStringOption(option =>
        option.setName('plano')
            .setDescription('Plano a editar')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addStringOption(option =>
        option.setName('nuevo-nombre')
            .setDescription('Nuevo nombre para el plano')
            .setRequired(false)
    )
    .addIntegerOption(option =>
        option.setName('nueva-duracion')
            .setDescription('Nueva duración en minutos')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(1440)
    )
    .addStringOption(option =>
        option.setName('nuevo-icono')
            .setDescription('Nueva URL del icono')
            .setRequired(false)
    );

export async function autocomplete(interaction: any) {
    const focusedValue = interaction.options.getFocused();
    
    try {
        const planos = await db.obtenerPlanos();
        
        const filtered = planos.filter(plano => 
            plano.nombre.toLowerCase().includes(focusedValue.toLowerCase())
        );

        await interaction.respond(
            filtered.slice(0, 25).map(plano => ({
                name: `${plano.nombre} (${plano.duracion_minutos}min)`,
                value: plano.id.toString()
            }))
        );
    } catch (error) {
        console.error('Error en autocomplete de planos:', error);
        await interaction.respond([]);
    }
}

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const planoId = parseInt(interaction.options.getString('plano', true));
        const nuevoNombre = interaction.options.getString('nuevo-nombre');
        const nuevaDuracion = interaction.options.getInteger('nueva-duracion');
        const nuevoIcono = interaction.options.getString('nuevo-icono');

        // Verificar que se proporcionó al menos un campo para actualizar
        if (!nuevoNombre && !nuevaDuracion && !nuevoIcono) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription('Debes proporcionar al menos un campo para actualizar.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Obtener el plano actual
        const planoActual = await db.obtenerPlanoPorId(planoId);
        if (!planoActual) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription('Plano no encontrado.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Actualizar el plano
        const actualizado = await db.actualizarPlano(
            planoId,
            nuevoNombre || planoActual.nombre,
            nuevaDuracion || planoActual.duracion_minutos,
            nuevoIcono !== null ? nuevoIcono : planoActual.icono_url
        );

        if (actualizado) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('✅ Plano Actualizado')
                .setDescription(`El plano **${planoActual.nombre}** ha sido actualizado correctamente.`)
                .addFields(
                    { name: '📋 Nombre', value: nuevoNombre || planoActual.nombre, inline: true },
                    { name: '⏱️ Duración', value: `${nuevaDuracion || planoActual.duracion_minutos} minutos`, inline: true },
                    { name: '🎯 Icono', value: (nuevoIcono !== null ? nuevoIcono : planoActual.icono_url) || 'Sin icono', inline: true }
                )
                .setTimestamp();

            if (nuevoIcono !== null && nuevoIcono) {
                successEmbed.setThumbnail(nuevoIcono);
            } else if (planoActual.icono_url) {
                successEmbed.setThumbnail(planoActual.icono_url);
            }

            await interaction.reply({ embeds: [successEmbed] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription('No se pudo actualizar el plano.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

    } catch (error) {
        console.error('Error ejecutando comando editar-plano:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('❌ Error')
            .setDescription('Ocurrió un error al editar el plano.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}
