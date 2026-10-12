/* 노래 만들기 회귀 테스트 (v108).  앱을 http 로 열고 콘솔에:  const m=await import('./test/song.test.js'); await m.default();
   합성한 "허밍"(배음·비브라토·숨소리 잡음, 박자를 살짝 흔듦)을 분석에 넣어 음·박·조·코드가 나오는지, 편곡·WAV·MIDI·악보 보내기가 도는지 본다.
   사용자의 지난 노래(konti:smlast)는 갈무리했다 되돌린다. */
export default async function songTest(){
  const T=[]; let pass=0, fail=0; const ok=(n,c,i)=>{ T.push({name:n,cond:c}); if(c)pass++; else{ fail++; console.warn('✗',n,i); } };
  const keep=localStorage.getItem('konti:smlast'), shown=KB.shown, snap=JSON.parse(JSON.stringify({notes:SM.notes,chords:SM.chords,bpm:SM.bpm,recBpm:SM.recBpm,key:SM.key,style:SM.style,tr:SM.tr,lyric:SM.lyric,transp:SM.transp}));
  const realSave=window.scheduleSave; window.scheduleSave=()=>{};
  const keepRaw=S.raw, keepTitle=$('title').value;
  try{
    showScreen('sm');
    // 학교종이 앞부분: 솔솔라라 솔솔미- 솔솔미미 레--  (4분=1박, 96bpm)
    const mel=[[67,1],[67,1],[69,1],[69,1],[67,1],[67,1],[64,2],[67,1],[67,1],[64,1],[64,1],[62,3]];
    const bpm=96, spb=60/bpm, sr=44100, lead=.6, tot=lead+mel.reduce((a,b)=>a+b[1],0)*spb+.6;
    const ctx=AC(), buf=ctx.createBuffer(1,Math.ceil(tot*sr),sr), d=buf.getChannelData(0);
    let t=lead, seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
    for(const [m,b] of mel){ const f0=440*Math.pow(2,(m-69+.18)/12), dur=b*spb*.9, st=Math.floor((t+(rnd()-.5)*.05)*sr), n=Math.floor(dur*sr); let ph=0;
      for(let i=0;i<n;i++){ const tt=i/sr, vib=1+.004*Math.sin(2*Math.PI*5.5*tt), env=Math.min(1,tt/.03)*Math.min(1,(dur-tt)/.05);
        ph+=2*Math.PI*f0*vib/sr; d[st+i]+=env*(.25*Math.sin(ph)+.12*Math.sin(2*ph)+.06*Math.sin(3*ph))+(rnd()-.5)*.01; }
      t+=b*spb; }
    SM.metro=true; SM.bpm=SM.recBpm=bpm; SM.sttText='학교 종이 땡 땡 땡 어서 모이 자 선생 님이'; SM.snap=true;
    await smFromBuffer(buf,lead,false);
    const got=SM.notes.map(n=>n.m), want=mel.map(x=>x[0]);
    ok('음 개수가 맞다(12)',SM.notes.length===12,got);
    ok('음 높이가 맞다(살짝 높게 부른 것을 보정)',JSON.stringify(got)===JSON.stringify(want),got);
    ok('박자가 맞다(1·1·…·2·…·3)',JSON.stringify(SM.notes.map(n=>n.dur))===JSON.stringify(mel.map(x=>x[1])),SM.notes.map(n=>n.on+':'+n.dur));
    ok('첫 음이 0박',SM.notes[0]&&SM.notes[0].on===0,SM.notes[0]);
    ok('조의 음계가 멜로디 음을 다 담는다',SM.notes.every(n=>smScale().includes(mod(n.m-SM.key.pc))),SM.key);
    ok('마디 4개, 코드 4개',SM.nb===4&&SM.chords.length===4&&SM.chords.every(c=>c&&c.root!==undefined),[SM.nb,SM.chords]);
    ok('가사가 음에 붙는다',SM.notes[0].ly==='학'&&SM.notes[3].ly==='이',SM.notes.map(n=>n.ly).join(''));
    ok('편집 화면이 보인다',!$('smedit').hidden&&$('smroll').querySelectorAll('[data-i]').length===12);
    // 편곡
    const A=smEvents();
    ok('전주·1절·2절·후주 네 구간',A.secs.map(s=>s.k).join(',')==='intro,v1,v2,outro',A.secs.map(s=>s.k));
    ok('반주·드럼 이벤트가 있다',A.ev.length>60&&A.dr.length>20,[A.ev.length,A.dr.length]);
    const lead1=A.ev.filter(e=>e.inst===SM.lead&&e.t>=A.secs[1].t-1e-6&&e.t<A.secs[2].t-1e-6);
    ok('1절 멜로디 악기가 12음을 친다',lead1.length===12,lead1.length);
    ok('내 목소리가 들어간다(빠르기·조 그대로)',smVoiceOk());
    SM.style='pop'; const B=smEvents(); ok('스타일을 바꾸면 편성이 바뀐다',B.ev.some(e=>e.inst==='guitar')&&!A.ev.some(e=>e.inst==='guitar'));
    SM.style='ballad';
    // 편집
    SM.sel=0; $('smup').click(); ok('음 고치기: 반음 올리기',SM.notes[0].m===68); $('smdn').click();
    SM.sel=11; $('smadd').click(); ok('음 넣기',SM.notes.length===13); $('smdel').click(); ok('음 지우기',SM.notes.length===12);
    smChordPop(0); $('smchin').value='Am'; $('smchok').click(); ok('코드 직접 바꾸기',SM.chords[0].root===9&&SM.chords[0].suffix==='m'&&$('smpop').hidden);
    SM.transp=2; ok('조를 옮기면 내 목소리는 빠진다',!smVoiceOk()); SM.transp=0;
    // 내려받기
    let blobs=[]; const realDl=window.smDownload; window.smDownload=(b,n)=>blobs.push({b,n});
    try{
      smExportMidi(); ok('MIDI 파일',blobs[0]&&blobs[0].n.endsWith('.mid')&&blobs[0].b.size>200,blobs[0]&&blobs[0].b.size);
      SM.tr.intro=false; SM.tr.verse2=false; await smExportWav(); SM.tr.intro=true; SM.tr.verse2=true;
      const w=blobs[1]; ok('WAV 파일',w&&w.n.endsWith('.wav')&&w.b.size>100000,w&&w.b.size);
      if(w){ const ab=await AC().decodeAudioData(await w.b.arrayBuffer()), x=ab.getChannelData(0); let pk=0; for(let i=0;i<x.length;i+=7)pk=Math.max(pk,Math.abs(x[i])); ok('WAV 에 소리가 들어 있다',pk>.05,pk); }
    }finally{ window.smDownload=realDl; }
    smToScore();
    ok('악보 연주로 보내기',KB.shown==='score'&&/^♪ G4:1 G4:1 A4:1 A4:1/.test(S.raw)&&/\|\[Am\]학교종이/.test(S.raw),S.raw.slice(0,120));
  }finally{
    window.scheduleSave=realSave; S.raw=keepRaw; $('title').value=keepTitle; try{ reparse(); renderAll(); }catch(e){}
    Object.assign(SM,snap); if(keep===null)localStorage.removeItem('konti:smlast'); else localStorage.setItem('konti:smlast',keep);
    smStop(); showScreen(shown==='sm'?'home':(shown||'home'));
  }
  console.table(T.map(t=>({검사:t.name,결과:t.cond?'통과':'실패'})));
  console.log((fail?'✗ ':'✓ ')+'song: '+pass+' 통과 / '+fail+' 실패');
  return {pass,fail};
}
