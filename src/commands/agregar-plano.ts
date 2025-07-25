import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

const db = new DatabaseManager();

export const data = new SlashCommandBuilder()
    .setName('agregar-plano')
    .setDescription('Agregar un nuevo plano')
    .addStringOption(option =>
        option.setName('nombre')
            .setDescription('Nombre del plano')
            .setRequired(true)
    )
    .addIntegerOption(option =>
        option.setName('duracion')
            .setDescription('Duración en minutos')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1440)
    )
    .addStringOption(option =>
        option.setName('icono')
            .setDescription('URL del icono del plano')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const nombre = interaction.options.getString('nombre', true);
        const duracion = interaction.options.getInteger('duracion', true);
        const icono = interaction.options.getString('icono');

        // Crear el plano
        const id = await db.crearPlano(nombre, duracion, icono || undefined);

        if (id > 0) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('✅ Plano Agregado')
                .setDescription(`El plano **${nombre}** ha sido creado correctamente.`)
                .addFields(
                    { name: '🆔 ID', value: id.toString(), inline: true },
                    { name: '📋 Nombre', value: nombre, inline: true },
                    { name: '⏱️ Duración', value: `${duracion} minutos`, inline: true }
                )
                .setTimestamp();

            if (icono) {
                successEmbed.addFields({ name: '🎯 Icono', value: icono, inline: false });
                successEmbed.setThumbnail(icono);
            }

            await interaction.reply({ embeds: [successEmbed] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription('No se pudo crear el plano. Es posible que ya exista uno con ese nombre.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

    } catch (error) {
        console.error('Error ejecutando comando agregar-plano:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('❌ Error')
            .setDescription('Ocurrió un error al crear el plano.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}
