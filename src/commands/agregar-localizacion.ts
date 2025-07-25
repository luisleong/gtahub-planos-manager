import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

const db = new DatabaseManager();

export const data = new SlashCommandBuilder()
    .setName('agregar-localizacion')
    .setDescription('Agregar una nueva localización')
    .addStringOption(option =>
        option.setName('nombre')
            .setDescription('Nombre de la localización')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('foto')
            .setDescription('URL de la foto de la localización')
            .setRequired(false)
    )
    .addBooleanOption(option =>
        option.setName('disponible')
            .setDescription('¿Está disponible para fabricación? (por defecto: Sí)')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const nombre = interaction.options.getString('nombre', true);
        const foto = interaction.options.getString('foto');
        const disponible = interaction.options.getBoolean('disponible') ?? true;

        // Crear la localización con la disponibilidad correcta desde el inicio
        const id = await db.crearLocalizacion(nombre, foto || undefined, disponible);

        if (id > 0) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('✅ Localización Agregada')
                .setDescription(`La localización **${nombre}** ha sido creada correctamente.`)
                .addFields(
                    { name: '🆔 ID', value: id.toString(), inline: true },
                    { name: '📍 Nombre', value: nombre, inline: true },
                    { name: '✅ Disponible', value: disponible ? 'Sí' : 'No', inline: true }
                )
                .setTimestamp();

            if (foto) {
                successEmbed.addFields({ name: '📸 Foto', value: foto, inline: false });
                successEmbed.setThumbnail(foto);
            }

            await interaction.reply({ embeds: [successEmbed] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription('No se pudo crear la localización. Es posible que ya exista una con ese nombre.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

    } catch (error) {
        console.error('Error ejecutando comando agregar-localizacion:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('❌ Error')
            .setDescription('Ocurrió un error al crear la localización.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}
