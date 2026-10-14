/* 노래 파일 채보 회귀 테스트 (v117).  앱을 http 로 열고 콘솔에:  const m=await import('./test/ts.test.js'); await m.default();
   ★ 악기 샘플(인터넷)에 기대지 않게 소리를 직접 합성한다 — 멜로디(배음 있는 톱니파 + 떨림) · 패드 화음 · 베이스 · 킥(1·3박) · 스네어(2·4박).
   정답을 알고 만든 노래라 빠르기·박자·조·마디 첫 박·코드·멜로디 음을 그대로 견줄 수 있다. */
const MT=n=>440*Math.pow(2,(n-69)/12);
const PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function parseMel(s){ let on=0; const out=[]; for(const t of s.trim().split(/\s+/)){ const [n,d]=t.split(':'), du=d?+d:1; if(n!=='r'){ const acc=n[1]==='#'?1:n[1]==='b'?-1:0; out.push({m:(+n[n.length-1]+1)*12+PC[n[0]]+acc,on,dur:du}); } on+=du; } return out; }
const CHQ={'':[0,4,7],m:[0,3,7],'7':[0,4,7,10]};
function parseCh(s){ return s.split(' ').map(c=>{ const m=c.match(/^([A-G])([#b]?)(m|7)?$/); return {root:(PC[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)+12)%12,q:m[3]||''}; }); }
/* 노래 하나를 그린다: 전주 1마디(코드만) + 멜로디 */
async function render({bpm,ts,mel,ch,seed}){
  const spb=60/bpm, notes=parseMel(mel), chords=parseCh(ch), bars=chords.length, lead=ts, total=(bars+1)*ts*spb+1.5, sr=22050;
  const ctx=new OfflineAudioContext(1,Math.ceil(total*sr),sr), out=ctx.createGain(); out.gain.value=.5; out.connect(ctx.destination);
  const osc=(type,f,t,d,v,det)=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.value=f; if(det){ const l=ctx.createOscillator(), lg=ctx.createGain(); l.frequency.value=5.5; lg.gain.value=f*.006; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t+d+.1); }
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.02); g.gain.setValueAtTime(v,t+Math.max(.03,d-.06)); g.gain.linearRampToValueAtTime(0,t+d); o.connect(g); g.connect(out); o.start(t); o.stop(t+d+.05); };
  const noise=(t,d,v,lp,hp)=>{ const b=ctx.createBuffer(1,Math.ceil(d*sr),sr), x=b.getChannelData(0); let s=seed||7; for(let i=0;i<x.length;i++){ s=(s*16807)%2147483647; x[i]=(s/2147483647*2-1)*Math.exp(-i/sr/(d*.35)); }
    const src=ctx.createBufferSource(); src.buffer=b; const f=ctx.createBiquadFilter(); f.type=hp?'highpass':'lowpass'; f.frequency.value=hp||lp; const g=ctx.createGain(); g.gain.value=v; src.connect(f); f.connect(g); g.connect(out); src.start(t); };
  const kick=t=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(45,t+.12); g.gain.setValueAtTime(.9,t); g.gain.exponentialRampToValueAtTime(.001,t+.3); o.connect(g); g.connect(out); o.start(t); o.stop(t+.32); };
  const t0=.3;
  for(let b=0;b<=bars;b++){ const c=chords[Math.max(0,b-1)], bt=t0+b*ts*spb, iv=CHQ[c.q];
    for(const i of iv)osc('triangle',MT(52+((c.root+i+8)%12)),bt,ts*spb*.97,.05);
    osc('sine',MT(36+c.root),bt,ts*spb*.5,.28); if(ts===4)osc('sine',MT(36+(c.root+7)%12),bt+2*spb,2*spb*.95,.22);
    for(let k=0;k<ts;k++){ const t=bt+k*spb; if(k===0||(ts===4&&k===2))kick(t); else noise(t,.18,.35,0,1200); noise(t+spb/2,.05,.06,0,6000); } }
  for(const n of notes)osc('sawtooth',MT(n.m),t0+lead*spb+n.on*spb,n.dur*spb*.92,.11,true);
  return {buf:await ctx.startRendering(),notes:notes.map(n=>({...n,t:t0+lead*spb+n.on*spb})),chords,spb,t0,lead};
}
export default async function tsTest(){
  const T=[]; let pass=0, fail=0; const ok=(n,c,i)=>{ T.push({name:n,cond:c}); if(c)pass++; else{ fail++; console.warn('✗',n,i); } };
  // 1) KEY: 줄 — 조를 못 박는다
  { const bl=parseChart('KEY: Bb\n♪ C5:1 D5:1 E5:2\n| C | F |'); ok('KEY: Bb → 내림나장조',detectKey(bl).pc===10&&!detectKey(bl).minor,detectKey(bl));
    const b2=parseChart('KEY: F#m\n| A | E |'); ok('KEY: F#m → 올림바단조(첫 코드 A 가 아니라)',detectKey(b2).pc===6&&detectKey(b2).minor,detectKey(b2));
    ok('KEY: 줄은 가사·마디가 아니다',!bl.some(b=>b.k==='pairs'&&b.pairs.some(p=>/KEY/.test(p.text||''))),bl); }
  // 2) 4/4 장조 노래
  const song1={bpm:100,ts:4,seed:3,
    mel:'G4:1 G4:1 A4:1 B4:1 C5:2 B4:1 A4:1 G4:1.5 A4:.5 B4:1 G4:1 D4:2 r:2 E4:1 G4:1 C5:1 B4:1 A4:2 G4:1 F#4:1 G4:3 r:1',
    ch:'G C G D Em Am D G'};
  const r1=await render(song1); let res=null;
  try{ res=await tsAnalyze(r1.buf,{},()=>{}); }catch(e){ ok('채보가 끝난다',false,e); }
  if(res){
    ok('빠르기 100 ±2',Math.abs(res.bpm-100)<=2,res.bpm);
    ok('박자 4/4',res.meter===4,res.meter);
    ok('조 사장조(G)',res.key.pc===7&&!res.key.minor,res.key);
    let hit=0; for(const n of r1.notes){ const o=res.notes.find(q=>Math.abs(q.t-n.t)<.15); if(o&&mod(o.m-n.m)===0)hit++; }
    ok('멜로디 음(시작 ±0.15초·음이름) 70% 이상',hit>=r1.notes.length*.7,hit+'/'+r1.notes.length);
    // 마디 첫 박·코드: 전주 1마디 + 8마디 — 코드 줄을 그대로 견준다(전주는 첫 코드)
    const want=['G'].concat(song1.ch.split(' ')), got=res.bars.map(b=>b.ch[0]);
    let cm=0; for(let i=0;i<want.length;i++)if(got[i]===want[i])cm++;
    ok('마디 첫 박이 맞아 코드가 마디마다 맞는다(9마디 중 7 이상)',cm>=7,got.join(' ')+' / '+want.join(' '));
    // 악보 글 → 파서 왕복: 마디 수가 그대로
    const raw=tsToRaw(res), bl=parseChart(raw); let N=0,pm=null;
    for(const b of bl){ if(b.k==='mel'){pm=b;continue;} if(b.k==='pairs'){ N+=measuresOfBlock(pm,b).N; pm=null; } }
    ok('악보로 옮기면 마디 수가 그대로',N===res.bars.length,[N,res.bars.length]);
    ok('조표가 G(#1)',detectKey(bl).pc===7,detectKey(bl));
    ok('마디마다 박 합이 4',res.bars.every(b=>Math.abs(b.toks.reduce((a,x)=>a+parseFloat(x.split(':')[1]),0)-4)<1e-6),res.bars.map(b=>b.toks.join(' ')));
    ok('점음표(1.5박)를 적는다',/:1\.5\b/.test(raw),raw);
  }
  // 3) 3/4 단조 노래 — 박자를 3으로 찾는가
  const song2={bpm:90,ts:3,seed:11,
    mel:'A4:2 C5:1 B4:2 A4:1 G#4:2 E4:1 A4:3 C5:2 D5:1 E5:2 D5:1 C5:1 B4:1 A4:1 B4:3',
    ch:'Am Dm E Am Am Dm Am E'};
  const r2=await render(song2); let res2=null;
  try{ res2=await tsAnalyze(r2.buf,{},()=>{}); }catch(e){ ok('3/4 채보가 끝난다',false,e); }
  if(res2){
    ok('3/4 를 찾는다',res2.meter===3,res2.meter);
    ok('단조(Am)',res2.key.pc===9&&res2.key.minor,res2.key);
    ok('빠르기 90 ±3',Math.abs(res2.bpm-90)<=3,res2.bpm);
    let hit=0; for(const n of r2.notes){ const o=res2.notes.find(q=>Math.abs(q.t-n.t)<.15); if(o&&mod(o.m-n.m)===0)hit++; }
    ok('3/4 멜로디 음 70% 이상',hit>=r2.notes.length*.7,hit+'/'+r2.notes.length);
  }
  // 4) 박자를 정해 주면 그대로 쓴다
  if(r1){ const r3=await tsAnalyze(r1.buf,{meter:3,bpm:100,grid:.5},()=>{});
    ok('박자·빠르기를 정해 주면 그대로',r3.meter===3&&r3.bpm===100,[r3.meter,r3.bpm]);
    ok('간단히(8분까지)면 16분음표가 없다',r3.bars.every(b=>b.toks.every(x=>!/:0\.25$|:0\.75$/.test(x))),r3.bars.map(b=>b.toks.join(' '))); }
  console.table(T.map(t=>({검사:t.name,결과:t.cond?'통과':'실패'})));
  console.log((fail?'✗ ':'✓ ')+'ts: '+pass+' 통과 / '+fail+' 실패');
  return {pass,fail};
}
