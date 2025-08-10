import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

const db = new DatabaseManager();

export default {
  data: new SlashCommandBuilder()
    .setName('editar-localizacion')
    .setDescription('Editar una localización existente')
    .addStringOption(option =>
        option.setName('localizacion')
            .setDescription('Localización a editar')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addStringOption(option =>
        option.setName('nuevo-nombre')
            .setDescription('Nuevo nombre para la localización')
            .setRequired(false)
    )
    .addStringOption(option =>
        option.setName('nueva-foto')
            .setDescription('Nueva URL de la foto')
            .setRequired(false)
    )
    .addBooleanOption(option =>
        option.setName('disponible')
            .setDescription('¿Está disponible para fabricación?')
            .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // Tu lógica de edición aquí (puedes descomentar el bloque real si lo deseas)
    await interaction.reply('Localización editada (demo).');
  }
};

/*
export async function autocomplete(interaction: any) {
    const focusedValue = interaction.options.getFocused();
    
    try {
        const localizaciones = await db.obtenerTodasLasLocalizaciones();
        
        const filtered = localizaciones.filter(loc => 
            loc.nombre.toLowerCase().includes(focusedValue.toLowerCase())
        );

        await interaction.respond(
            filtered.slice(0, 25).map(loc => ({
                name: `${loc.nombre} ${loc.disponible_para_fabricacion ? '✅' : '❌'}`,
                value: loc.id.toString()
            }))
        );
    } catch (error) {
        console.error('Error en autocomplete de localizaciones:', error);
        await interaction.respond([]);
    }
}

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const localizacionId = parseInt(interaction.options.getString('localizacion', true));
        const nuevoNombre = interaction.options.getString('nuevo-nombre');
        const nuevaFoto = interaction.options.getString('nueva-foto');
        const disponible = interaction.options.getBoolean('disponible');

        // Verificar que se proporcionó al menos un campo para actualizar
        if (!nuevoNombre && !nuevaFoto && disponible === null) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription('Debes proporcionar al menos un campo para actualizar.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Obtener la localización actual
        const localizacionActual = await db.obtenerLocalizacionPorId(localizacionId);
        if (!localizacionActual) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription('Localización no encontrada.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Actualizar la localización
        const actualizado = await db.actualizarLocalizacion(
            localizacionId,
            nuevoNombre || localizacionActual.nombre,
            nuevaFoto !== null ? nuevaFoto : localizacionActual.foto_url,
            disponible !== null ? disponible : localizacionActual.disponible_para_fabricacion
        );

        if (actualizado) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('✅ Localización Actualizada')
                .setDescription(`La localización **${localizacionActual.nombre}** ha sido actualizada correctamente.`)
                .addFields(
                    { name: '📍 Nombre', value: nuevoNombre || localizacionActual.nombre, inline: true },
                    { name: '📸 Foto', value: (nuevaFoto !== null ? nuevaFoto : localizacionActual.foto_url) || 'Sin foto', inline: true },
                    { name: '✅ Disponible', value: (disponible !== null ? disponible : localizacionActual.disponible_para_fabricacion) ? 'Sí' : 'No', inline: true }
                )
                .setTimestamp();

            if (nuevaFoto !== null && nuevaFoto) {
                successEmbed.setThumbnail(nuevaFoto);
            } else if (localizacionActual.foto_url) {
                successEmbed.setThumbnail(localizacionActual.foto_url);
            }

            await interaction.reply({ embeds: [successEmbed] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription('No se pudo actualizar la localización.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

    } catch (error) {
        console.error('Error ejecutando comando editar-localizacion:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('❌ Error')
            .setDescription('Ocurrió un error al editar la localización.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}
*/
