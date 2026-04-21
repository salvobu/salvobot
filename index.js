const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, AttachmentBuilder } = require('discord.js');
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
  data = JSON.parse(fs.readFileSync('./data.json'));
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

// ===== SES =====
client.on('voiceStateUpdate', (o,n) => {
  const u = n.member;
  if (!data[u.id]) data[u.id]={total:0,weekly:0,monthly:0,yearly:0,last:null};

  if (!o.channel && n.channel) data[u.id].last = Date.now();

  if (o.channel && !n.channel && data[u.id].last){
    const s = Date.now()-data[u.id].last;
    data[u.id].total+=s;
    data[u.id].weekly+=s;
    data[u.id].monthly+=s;
    data[u.id].yearly+=s;
    data[u.id].last=null;
    save();
  }
});

// ===== MESAJ =====
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  const args = message.content.split(' ');
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

  // ===== UZUN =====
  if(message.content.length>500 && !yetkili){
    await message.delete().catch(()=>{});
    await message.member.timeout(5*60*1000).catch(()=>{});
  }

  // ===== SES =====
  if(cmd==='!ses'){
    const v=data[message.author.id];
    if(!v) return message.reply('Veri yok');

    const saat = x=>(x/1000/60/60).toFixed(2);

    const canvas=Canvas.createCanvas(800,400);
    const ctx=canvas.getContext('2d');

    ctx.fillStyle='#000';
    ctx.fillRect(0,0,800,400);

    ctx.fillStyle='#0ff';
    ctx.font='30px sans-serif';
    ctx.fillText('SES PANEL',300,50);

    const avatar=await Canvas.loadImage(message.author.displayAvatarURL({extension:'png'}));
    ctx.drawImage(avatar,50,100,150,150);

    ctx.fillStyle='#fff';
    ctx.fillText(`Toplam: ${saat(v.total)} saat`,300,150);
    ctx.fillText(`Haftalık: ${saat(v.weekly)} saat`,300,200);
    ctx.fillText(`Aylık: ${saat(v.monthly)} saat`,300,250);
    ctx.fillText(`Yıllık: ${saat(v.yearly)} saat`,300,300);

    const a=new AttachmentBuilder(canvas.toBuffer(),{name:'ses.png'});
    return message.channel.send({files:[a]});
  }

  // ===== YETKİ =====
  if(!yetkili) return;

  // ===== SİL =====
  if(cmd==='!sil'){
    const n=parseInt(args[1]);
    if(!n||n<1||n>100) return message.reply('1-100 gir');

    try{
      const sil = await message.channel.bulkDelete(n,true);
      message.channel.send(`🧹 ${sil.size} mesaj silindi`).then(m=>setTimeout(()=>m.delete(),3000));
      if(log) log.send(`🧹 ${message.author.tag} ${sil.size} mesaj sildi`);
    }catch{
      message.channel.send('❌ Silinemedi');
    }
  }

  // ===== KICK =====
  if(cmd==='!at'){
    const k=message.mentions.members.first();
    if(!k) return message.reply('Etiketle');
    if(!k.kickable) return message.reply('Atamam');

    try{
      await k.kick();
      message.channel.send(`👢 ${k.user.tag} atıldı`);
      if(log) log.send(`👢 ${k.user.tag} atıldı | ${message.author.tag}`);
    }catch{
      message.channel.send('❌ Kick atılamadı');
    }
  }

  // ===== BAN =====
  if(cmd==='!ban'){
    const k=message.mentions.members.first();
    if(!k) return message.reply('Etiketle');
    if(!k.bannable) return message.reply('Banlayamam');

    try{
      await k.ban();
      message.channel.send(`🔨 ${k.user.tag} banlandı`);
      if(log) log.send(`🔨 ${k.user.tag} banlandı | ${message.author.tag}`);
    }catch{
      message.channel.send('❌ Ban atılamadı');
    }
  }

  // ===== TIMEOUT =====
  if(cmd==='!s'){
    const k=message.mentions.members.first();
    const dk=parseInt(args[2]);
    if(!k||!dk) return message.reply('!s @kişi 5');

    try{
      await k.timeout(dk*60000);
      message.channel.send(`🔇 ${k.user.tag} ${dk} dk susturuldu`);
      if(log) log.send(`🔇 ${k.user.tag} ${dk}dk timeout | ${message.author.tag}`);
    }catch{
      message.channel.send('❌ Timeout atılamadı');
    }
  }

  // ===== NUKE =====
  if(cmd==='!nuke'){
    try{
      const yeni = await message.channel.clone();
      await message.channel.delete();
      await fotoAyarla(yeni.guild);
      if(log) log.send(`💣 ${message.author.tag} nuke attı`);
    }catch{
      message.channel.send('❌ Nuke başarısız');
    }
  }

});
client.login(process.env.TOKEN); 
