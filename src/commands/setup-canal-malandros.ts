import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    TextChannel,
    PermissionFlagsBits
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { MensajesRobosManager } from '../services/MensajesRobosManager';
import { RobosManager } from '../database/RobosManager';

export const data = new SlashCommandBuilder()
    .setName('setup-canal-malandros')
    .setDescription('Configura el canal persistente para robos y malandros en este canal');

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        await interaction.deferReply({ ephemeral: true });
        const canal = interaction.channel as TextChannel;
        if (!canal) {
            await interaction.editReply({ content: '❌ No se pudo acceder al canal.' });
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

        // Guardar el canal en el config.json del cliente
        const cliente = (process.env.CLIENTE || 'n-c-s').toLowerCase();
        const configPath = path.resolve(__dirname, `../../clientes/${cliente}/config.json`);
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.MALANDROS_CHANNEL_ID = canal.id;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Limpiar mensajes existentes del canal
        let mensajes = await canal.messages.fetch({ limit: 100 });
        for (const msg of mensajes.values()) {
            try { await msg.delete(); } catch {}
        }

        // Inicializar managers y enviar mensajes persistentes
        const dbPath = config.DATABASE_PATH || './data/planos.db';
        const robosManager = new RobosManager(dbPath);
        await robosManager.initialize();
        const mensajesRobosManager = new MensajesRobosManager(interaction.client, robosManager);
        await mensajesRobosManager.enviarMensajeRobos(canal.id);
        await mensajesRobosManager.enviarMensajeMalandros(canal.id);

        await interaction.editReply({
            content: `✅ Canal configurado exitosamente para robos y malandros. Los mensajes persistentes han sido enviados.`
        });
    } catch (error) {
        console.error('Error en setup-canal-malandros:', error);
        await interaction.editReply({
            content: '❌ Error al configurar el canal de malandros/robos.'
        });
    }
}
