/* 건반 게임 회귀 테스트 (v106).  앱을 http 로 열고 콘솔에:  const m=await import('./test/game.test.js'); await m.default();
   자동으로 건반을 눌러 쉬움·보통 모드를 끝까지 돌리고, 아무것도 안 누르면 미스로 끝나는지 본다. 사용자의 최고 기록(konti:gmbest)은 갈무리했다 되돌린다. */
export default async function gameTest(){
  const T=[]; let pass=0, fail=0; const ok=(n,c,i)=>{ T.push({name:n,cond:c}); if(c)pass++; else{ fail++; console.warn('✗',n,i); } };
  const keep=localStorage.getItem('konti:gmbest'), shown=KB.shown, lvl=GM.level, song=GM.song;
  const W=ms=>new Promise(r=>setTimeout(r,ms));
  try{
    localStorage.removeItem('konti:gmbest'); showScreen('gm');
    const keys=document.getElementById('gmkeys');
    ok('건반이 8개 만들어진다',keys.children.length===8);
    const press=l=>{ const k=keys.children[l], r=k.getBoundingClientRect(), o={pointerId:70+l,pointerType:'touch',clientX:r.left+r.width/2,clientY:r.top+r.height*.7,bubbles:true,cancelable:true};
      k.dispatchEvent(new PointerEvent('pointerdown',o)); setTimeout(()=>k.dispatchEvent(new PointerEvent('pointerup',o)),40); };
    for(const s of GM_SONGS){ const bl=gmParse(s); ok('곡 「'+s.name+'」의 음이 전부 8개 건반 안에 있다',bl.length===s.n.split(/\s+/).filter(x=>!x.startsWith('r:')).length&&bl.length>8,bl.length); }
    // 쉬움: 맞는 건반을 누를 때까지 기다려 준다
    GM.level='easy'; GM.song=GM_SONGS.find(s=>s.id==='scale'); gmReset(); gmStart();
    let t0=performance.now(), waitedAtLeastOnce=false;
    while(!GM.done&&performance.now()-t0<40000){ await W(30); const h=document.querySelector('.gk.hint'); if(GM.waiting&&h){ waitedAtLeastOnce=true; const T0=GM.T; await W(250); if(GM.T!==T0)ok('기다리는 동안 블록이 안 내려온다',false,[T0,GM.T]); press(+h.dataset.l); await W(120); } }
    ok('쉬움: 끝까지 가고 3별',GM.done&&document.getElementById('gmstars').textContent==='★★★',document.getElementById('gmstars').textContent);
    ok('쉬움: 기다려 준 적이 있다',waitedAtLeastOnce);
    ok('쉬움: 기록이 저장된다',!!gmBest('scale','easy')&&gmBest('scale','easy').stars===3);
    // 틀린 건반은 벌점 없이 세기만 한다
    GM.level='easy'; gmReset(); gmStart(); await W(300);
    // 보통: 박자대로 누르면 퍼펙트
    GM.level='normal'; GM.song=GM_SONGS.find(s=>s.id==='school'); gmReset(); gmStart();
    const pressed=new Set(); t0=performance.now();
    while(!GM.done&&performance.now()-t0<90000){ await W(10); for(const b of GM.blocks)if(!b.hit&&!b.gone&&!pressed.has(b)&&GM.T>=b.beat-.03){ pressed.add(b); press(b.lane); } }
    ok('보통: 박자대로 누르면 거의 다 맞는다',GM.done&&GM.perfect+GM.good>=GM.blocks.length-1&&GM.miss<=1,[GM.perfect,GM.good,GM.miss]);
    ok('보통: 콤보가 쌓인다',GM.maxCombo>=10,GM.maxCombo);
    // 아무것도 안 누르면 전부 미스
    GM.song=GM_SONGS.find(s=>s.id==='scale'); gmReset(); gmStart(); t0=performance.now();
    while(!GM.done&&performance.now()-t0<60000)await W(100);
    ok('안 누르면 전부 미스 · 별 0',GM.done&&GM.miss===GM.blocks.length&&document.getElementById('gmstars').textContent==='☆☆☆',[GM.miss,GM.blocks.length]);
    // 화면 나갈 때 정리
    showScreen('home');
    ok('나가면 게임이 멈추고 건반 악기가 되돌아간다',GM.started===false&&KB.inst===(GM.prevInst||KB.inst));
  }finally{
    if(keep===null)localStorage.removeItem('konti:gmbest'); else localStorage.setItem('konti:gmbest',keep);
    GM.level=lvl; GM.song=song; showScreen(shown==='gm'?'home':shown);
  }
  console.table(T.map(t=>({검사:t.name,결과:t.cond?'통과':'실패'})));
  console.log((fail?'✗ ':'✓ ')+'game: '+pass+' 통과 / '+fail+' 실패');
  return {pass,fail};
}
