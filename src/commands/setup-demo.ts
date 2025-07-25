import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
    EmbedBuilder
} from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

export const data = new SlashCommandBuilder()
    .setName('setup-demo')
    .setDescription('Configura datos de demostración con imágenes como en tu ejemplo');

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const dbManager = new DatabaseManager();
        
        await interaction.deferReply({ ephemeral: true });

        // Limpiar datos existentes
        await dbManager.limpiarTodasLasLocalizaciones();
        await dbManager.limpiarTodosLosPlanos();
        
        // Crear localizaciones con imágenes reales de GTA
        const localizaciones = [
            {
                nombre: 'BUNKER',
                foto_url: 'https://i.imgur.com/7QqK8Xv.png' // Imagen del bunker de GTA
            },
            {
                nombre: 'METH LAB',
                foto_url: 'https://i.imgur.com/mJ9fK2c.png' // Laboratorio de metanfetaminas
            },
            {
                nombre: 'COCAINE LAB',
                foto_url: 'https://i.imgur.com/hVzN6Kw.png' // Laboratorio de cocaína
            },
            {
                nombre: 'MC CLUBHOUSE',
                foto_url: 'https://i.imgur.com/YjT4E8R.png' // Sede del MC
            },
            {
                nombre: 'ARPOS LISTOS',
                foto_url: 'https://i.imgur.com/9s3H2eN.png' // Yate
            }
        ];

        // Crear planos de ejemplo
        const planos = [
            { nombre: 'Rifle de Combate', duracion_minutos: 180 },
            { nombre: 'Ametralladora de Combate', duracion_minutos: 240 },
            { nombre: 'RPG', duracion_minutos: 300 },
            { nombre: 'Cañón UP-n-Atomizer', duracion_minutos: 360 },
            { nombre: 'Minigun', duracion_minutos: 420 }
        ];

        let localizacionesCreadas = 0;
        let planosCreados = 0;

        // Insertar localizaciones
        for (const loc of localizaciones) {
            try {
                await dbManager.crearLocalizacion(loc.nombre, loc.foto_url);
                localizacionesCreadas++;
            } catch (error) {
                console.error(`Error creando localización ${loc.nombre}:`, error);
            }
        }

        // Insertar planos
        for (const plano of planos) {
            try {
                await dbManager.crearPlano(plano.nombre, plano.duracion_minutos);
                planosCreados++;
            } catch (error) {
                console.error(`Error creando plano ${plano.nombre}:`, error);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Demo Configurada')
            .setDescription(`**Localizaciones creadas:** ${localizacionesCreadas}\n**Planos creados:** ${planosCreados}\n\n🎯 Usa \`/panel-localizaciones\` para ver el panel visual`)
            .setColor(0x57F287)
            .setFooter({ text: 'GTAHUB Planos Manager' })
            .setTimestamp();

        await interaction.editReply({
            embeds: [embed]
        });

    } catch (error) {
        console.error('Error en setup-demo:', error);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Error al configurar la demo.',
                ephemeral: true
            });
        } else {
            await interaction.editReply({
                content: '❌ Error al configurar la demo.'
            });
        }
    }
}
