import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  Guild,
} from 'discord.js';

const cliente = (process.env.CLIENTE || 'n-c-s').toLowerCase();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require(`../../clientes/${cliente}/config.json`);

export const data = new SlashCommandBuilder()
  .setName('despedir')
  .setDescription('Despedir a un miembro del taller (solo usuarios con rol Miembro)')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('Usuario a despedir')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const usuario = interaction.options.getUser('usuario');
    if (!usuario) {
      await interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });
      return;
    }
    const guild = interaction.guild as Guild;
    if (!guild) {
      await interaction.reply({ content: '❌ Este comando solo funciona en servidores.', ephemeral: true });
      return;
    }
    const miembro = await guild.members.fetch(usuario.id);
    if (!miembro.roles.cache.has(config.MIEMBRO_ROLE_ID)) {
      await interaction.reply({ content: `❌ El usuario seleccionado no tiene el rol Miembro y no puede ser despedido.`, ephemeral: true });
      return;
    }
    await miembro.roles.remove(config.MIEMBRO_ROLE_ID);
    await interaction.reply({ content: `👋 <@${usuario.id}> ha sido despedido del taller.`, ephemeral: false });
  } catch (error: any) {
    console.error('❌ Error en /despedir:', error);
    await interaction.reply({ content: `❌ Error ejecutando /despedir: ${error?.message || error}`, ephemeral: true });
  }
}
