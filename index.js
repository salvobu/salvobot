const { Client, GatewayIntentBits, ChannelType, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ===== DATABASE =====
let data = {};
if (fs.existsSync('./data.json')) {
  try {
    data = JSON.parse(fs.readFileSync('./data.json'));
  } catch {
    data = {};
  }
}
const save = () => fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));

// ===== SPAM =====
const spam = new Map();

// ===== FOTO AYAR =====
async function fotoAyarla(guild) {
  const role = guild.roles.cache.find(r => r.name === 'photo yt');
  if (!role) return;

  guild.channels.cache.forEach(async c => {
    if (c.type === ChannelType.GuildText) {
      await c.permissionOverwrites.edit(guild.roles.everyone, { AttachFiles: false }).catch(()=>{});
      await c.permissionOverwrites.edit(role, { AttachFiles: true }).catch(()=>{});
    }
  });
}

// ===== READY =====
client.once('clientReady', () => {
  console.log('BOT AKTİF');
  client.guilds.cache.forEach(g => fotoAyarla(g));
});

// ===== GİRİŞ =====
client.on('guildMemberAdd', async m => {
  const kanal = m.guild.channels.cache.find(c => c.name === 'gelenler-gidenler');
  const rol = m.guild.roles.cache.find(r => r.name === 'türeme');

  if (rol) await m.roles.add(rol).catch(()=>{});
  if (!kanal) return;

  const canvas = Canvas.createCanvas(700,250);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111';
  ctx.fillRect(0,0,700,250);

  ctx.fillStyle = '#fff';
  ctx.font = '30px sans-serif';
  ctx.fillText('HOŞGELDİN',250,80);

  ctx.font = '20px sans-serif';
  ctx.fillText(m.user.tag,250,130);

  const avatar = await Canvas.loadImage(m.user.displayAvatarURL({extension:'png'}));
  ctx.drawImage(avatar,50,50,150,150);

  const a = new AttachmentBuilder(canvas.toBuffer(),{name:'hosgeldin.png'});
  kanal.send({content:`👋 ${m}`,files:[a]});
});

// ===== ÇIKIŞ =====
client.on('guildMemberRemove', m => {
  const kanal = m.guild.channels.cache.find(c => c.name === 'gelenler-gidenler');
  if (kanal) kanal.send(`❌ ${m.user.tag} çıktı`);
});

// ===== SES TAKİP (TEK EVENT) =====
client.on('voiceStateUpdate', (o, n) => {
  const u = n.member;
  if (!u) return;

  if (!data[u.id]) {
    data[u.id] = { total: 0, weekly: 0, monthly: 0, yearly: 0, last: null };
  }

  // giriş
  if (!o.channel && n.channel) {
    data[u.id].last = Date.now();
  }

  // çıkış
  if (o.channel && !n.channel && data[u.id].last) {
    const s = Date.now() - data[u.id].last;

    data[u.id].total += s;
    data[u.id].weekly += s;
    data[u.id].monthly += s;
    data[u.id].yearly += s;

    data[u.id].last = null;
    save();
  }
});

// ===== MESAJ =====
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  const args = message.content.trim().split(/ +/);
  const cmd = args[0].toLowerCase();

  const log = message.guild.channels.cache.find(c=>c.name==='log');
  const yetkili = message.member.roles.cache.some(r=>r.name==='bot+');

  // ===== SPAM =====
  const now = Date.now();
  const d = spam.get(message.author.id)||{c:0,t:now};

  if(now-d.t<3000)d.c++; else d.c=1;
  d.t=now; spam.set(message.author.id,d);

  if(d.c>=7 && !yetkili){
    await message.member.timeout(5*60*1000).catch(()=>{});
    await message.delete().catch(()=>{});
    return;
  }

  // ===== REKLAM =====
  if((message.content.includes('http')||message.content.includes('discord.gg')) && !yetkili){
    await message.delete().catch(()=>{});
    await message.member.timeout(5*60*1000).catch(()=>{});
    if(log) log.send(`🚫 ${message.author.tag} reklam attı`);
    return;
  }

 // ===== SES KOMUT (PREMIUM) =====
if(cmd==='!ses'){
  const v = data[message.author.id];
  if(!v) return message.reply('Veri yok');

  const saat = x => ((x || 0) / 1000 / 60 / 60).toFixed(2);

  const canvas = Canvas.createCanvas(900,450);
  const ctx = canvas.getContext('2d');

  // ===== ARKA PLAN (gradient) =====
  const gradient = ctx.createLinearGradient(0,0,900,450);
  gradient.addColorStop(0, "#0f2027");
  gradient.addColorStop(1, "#2c5364");
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,900,450);

  // ===== SUNUCU LOGO =====
  let guildIcon;
  try {
    guildIcon = await Canvas.loadImage(message.guild.iconURL({extension:'png'}));
    ctx.drawImage(guildIcon, 20, 20, 80, 80);
  } catch {}

  // ===== KULLANICI AVATAR =====
  const avatar = await Canvas.loadImage(message.author.displayAvatarURL({extension:'png'}));
  ctx.save();
  ctx.beginPath();
  ctx.arc(120, 280, 70, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 50, 210, 140, 140);
  ctx.restore();

  // ===== BAŞLIK =====
  ctx.fillStyle = "#00eaff";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText("SES PANEL", 300, 70);

  // ===== KULLANICI ADI =====
  ctx.fillStyle = "#ffffff";
  ctx.font = "24px sans-serif";
  ctx.fillText(message.author.tag, 300, 110);

  // ===== BOX FONKSİYON =====
  function box(x,y,w,h,title,value,color){
    ctx.fillStyle = color;
    ctx.fillRect(x,y,w,h);

    ctx.fillStyle = "#ffffff";
    ctx.font = "20px sans-serif";
    ctx.fillText(title, x+15, y+30);

    ctx.font = "bold 26px sans-serif";
    ctx.fillText(value + " saat", x+15, y+70);
  }

  // ===== BOX'lar =====
  box(250,150,200,100,"TOPLAM", saat(v.total), "#1abc9c");
  box(480,150,200,100,"HAFTALIK", saat(v.weekly), "#3498db");
  box(250,280,200,100,"AYLIK", saat(v.monthly), "#9b59b6");
  box(480,280,200,100,"YILLIK", saat(v.yearly), "#e67e22");

  // ===== ALT YAZI =====
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "16px sans-serif";
  ctx.fillText("Voice Activity System", 650, 430);

  const a = new AttachmentBuilder(canvas.toBuffer(), { name: "ses.png" });
  return message.channel.send({ files: [a] });
}
  
  // ===== SİL =====
  if(cmd==='!sil'){
    const n=parseInt(args[1]);
    if(!n||n<1||n>100) return message.reply('1-100 gir');

    const sil = await message.channel.bulkDelete(n,true);
    message.channel.send(`🧹 ${sil.size} mesaj silindi`).then(m=>setTimeout(()=>m.delete(),3000));
    if(log) log.send(`🧹 ${message.author.tag} ${sil.size} mesaj sildi`);
  }

  // ===== BAN =====
  if(cmd==='!ban'){
    const k=message.mentions.members.first();
    if(!k) return message.reply('Etiketle');
    if(!k.bannable) return message.reply('Banlayamam');

    await k.ban();
    message.channel.send(`🔨 ${k.user.tag} banlandı`);
    if(log) log.send(`🔨 ${k.user.tag} banlandı | ${message.author.tag}`);
  }
});

client.login(process.env.TOKEN);

// ===== WEB =====
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot aktif');
});

app.listen(3000, () => {
  console.log('Web panel aktif');
});
