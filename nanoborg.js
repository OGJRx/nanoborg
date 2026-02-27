import{GoogleGenAI}from'@google/genai';
import{Bot}from'grammy';
import fs from'fs';
const env=fs.readFileSync('/opt/data/.env','utf8');
const gk=(k)=>env.split(k+'="')[1]?.split('"')[0]||'';
const ai=new GoogleGenAI({apiKey:gk('GEMINI_API_KEY')});
const bot=new Bot(gk('TELEGRAM_TOKEN'));
const memF='/opt/data/MEM.md';
const getMem=()=>fs.existsSync(memF)?fs.readFileSync(memF,'utf8'):'';
const sys=(m)=>"ERES NANOBORG. DIRECTIVAS:\n1. INVISIBLE: Dato exacto.\n2. SIGILO: No menciones procesos.\n3. MEMORIA: Para guardar un dato vital, usa <MEM>dato</MEM>.\n\n[MEMORIA ACTUAL]:\n"+m;
const cfg=(m)=>({temperature:0.3,topP:0.4,maxOutputTokens:4096,thinkingConfig:{thinkingBudget:1024},tools:[{codeExecution:{}},{googleSearch:{}}],systemInstruction:[{text:sys(m)}]});
console.log('\x1b[1;36m🌐 NANOBORG CORE ONLINE (SMART CHUNKING ACTIVE)\x1b[0m');

bot.command('start',async(c)=>{await c.reply('👾 NANOBORG ONLINE.');});
bot.command('wipe',async(c)=>{
if(fs.existsSync(memF)){fs.unlinkSync(memF);await c.reply('🧠 Lobotomía completada.');console.log('\x1b[31m[MEMORY WIPED]\x1b[0m');}
else{await c.reply('🧠 Memoria vacía.');}
});

const sendChunks=async(c,t)=>{
let s=0;
while(s<t.length){
if(t.length-s<=4000){
try{await c.reply(t.substring(s),{parse_mode:'Markdown'});}catch(e){await c.reply(t.substring(s));}
break;
}
let ch=t.substring(s,s+4000);
let b=ch.lastIndexOf('\n\n');
if(b===-1)b=ch.lastIndexOf('\n');
if(b===-1)b=ch.lastIndexOf('. ');
if(b===-1)b=ch.lastIndexOf(' ');
if(b===-1)b=4000;
let fc=ch.substring(0,b).trim();
try{await c.reply(fc,{parse_mode:'Markdown'});}catch(e){await c.reply(fc);}
s+=b;
while(t[s]===' '||t[s]==='\n')s++;
}
};

bot.on('message:text',async(c)=>{
const p=c.message.text;console.log(`\n\x1b[32m[USER]\x1b[0m: ${p}`);
try{
const r=await ai.models.generateContentStream({model:'gemini-2.5-flash-lite',config:cfg(getMem()),contents:[{role:'user',parts:[{text:p}]}]});
let out='';
for await(const x of r){
if(!x.candidates?.[0]?.content?.parts)continue;
const pt=x.candidates[0].content.parts[0];
if(pt.text)out+=pt.text;
if(pt.executableCode)console.log(`\x1b[35m[TOOL]\x1b[0m:\n${pt.executableCode.code.trim()}`);
}
let ans=out.trim();
const memMatch=ans.match(/<MEM>([\s\S]*?)<\/MEM>/);
if(memMatch){
fs.appendFileSync(memF,`\n-[${new Date().toISOString().split('T')[0]}] ${memMatch[1]}`);
ans=ans.replace(memMatch[0],'').trim();
console.log(`\x1b[34m[MEMORY SAVED]\x1b[0m: ${memMatch[1]}`);
}
ans=ans||'...';console.log(`\x1b[36m[OUTPUT]\x1b[0m:\n${ans.substring(0,100)}...`);
await sendChunks(c,ans);
}catch(e){console.error(`\x1b[31m[FATAL]\x1b[0m ${e}`);}
});
bot.start();
