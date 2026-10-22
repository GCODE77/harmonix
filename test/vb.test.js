/* 노래하는 새 회귀 테스트 (v113).  앱을 http 로 열고 콘솔에:  const m=await import('./test/vb.test.js'); await m.default();
   음→높이 변환 · 완벽하게 부르면 다 통과 · 소리를 안 내면 부딪혀 끝. 마이크는 쓰지 않는다(vbHear 를 바꿔 끼운다). */
export default async function vbTest(){
  const T=[]; let pass=0, fail=0; const ok=(n,c,i)=>{ T.push({name:n,cond:c}); if(c)pass++; else{ fail++; console.warn('✗',n,i); } };
  const W=ms=>new Promise(r=>setTimeout(r,ms)), keep=localStorage.getItem('konti:vbbest'), realHear=window.vbHear, realMic=window.vbMic, st={lv:VB.lv,song:VB.song,hint:VB.hint};
  try{
    ok('도4 → 0',Math.abs(vbPosOfMidi(60,3)-0)<1e-6); ok('솔4 → 4',Math.abs(vbPosOfMidi(67,3)-4)<1e-6);
    ok('높은 도(도5) → 7 (지금 높은 데 있으면)',Math.abs(vbPosOfMidi(72,6)-7)<1e-6);
    ok('남자 목소리 솔3 도 → 4 (옥타브 접기)',Math.abs(vbPosOfMidi(55,3)-4)<1e-6);
    ok('아이 목소리 미5 → 2',Math.abs(vbPosOfMidi(76,3)-2)<1e-6);
    ok('반음(도#) 은 도·레 사이',Math.abs(vbPosOfMidi(61,1)-.5)<1e-6);
    showScreen('vb'); window.vbMic=async()=>true; VB.hint=false; VB.scale=false; VB.lv='normal';
    // 완벽하게 부르는 사람
    VB.song='school';
    window.vbHear=()=>{ const q=VB.pipes.find(p=>!p.done); let p=q?q.p:3.5;
      if(VB.boss&&VB.boss.st==='fight'){ p=VB.boss.n[VB.boss.i]; const f=VB.mobs.find(m=>m.k==='fire'&&m.warn<=0&&m.x>VB.W*.24); if(f&&Math.abs(p-f.p)<1.5)p=p>3.5?p-3:p+3; }
      return 60+[0,2,4,5,7,9,11,12][Math.round(p)]+(p%1?1:0); };
    await vbStart(); let t0=performance.now(); while(!VB.over&&performance.now()-t0<260000)await W(100);
    ok('완벽하게 부르면 끝까지 다 통과',VB.over&&VB.clean===VB.total&&VB.stars>=VB.total&&VB.hearts>=5,[VB.clean,VB.stars,VB.total,VB.hearts]);
    ok('새 장애물이 실제로 나왔다(독수리·벌·애벌레·보스)',VB.mobs!==undefined&&VB.bossDone>=10&&VB.sawMob&&VB.sawMob.eagle,[VB.bossDone,VB.sawMob]);
    ok('곡 따라 부르기: 학교종이 음 순서로 파이프',VB.seq.slice(0,7).join(',')==='4,4,5,5,4,4,2',VB.seq.slice(0,7));
    await W(1700); ok('끝나면 결과 창',!document.getElementById('vbend').hidden&&/★★★/.test(document.getElementById('vbstars').textContent));
    // 소리를 안 내면
    VB.song='random'; window.vbHear=()=>null;
    await vbStart(); t0=performance.now(); while(!VB.over&&performance.now()-t0<60000)await W(100);
    ok('소리를 안 내면 떨어져 부딪히고 끝난다',VB.over&&VB.hearts<=0&&VB.clean<VB.total,[VB.hearts,VB.clean]);
    showScreen('home'); ok('나가면 멈춘다',!VB.started);
  }finally{
    window.vbHear=realHear; window.vbMic=realMic; Object.assign(VB,st); VB.started=false; cancelAnimationFrame(VB.raf);
    if(keep===null)localStorage.removeItem('konti:vbbest'); else localStorage.setItem('konti:vbbest',keep);
  }
  console.table(T.map(t=>({검사:t.name,결과:t.cond?'통과':'실패'})));
  console.log((fail?'✗ ':'✓ ')+'vb: '+pass+' 통과 / '+fail+' 실패');
  return {pass,fail};
}
