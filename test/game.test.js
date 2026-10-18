/* 건반 게임 회귀 테스트 (v107).  앱을 http 로 열고 콘솔에:  const m=await import('./test/game.test.js'); await m.default();
   100판 데이터 점검 · 검은 건반 · 쉬움(연습)/보통 자동 플레이 · 안 누르면 미스 · 팝업 목록 스크롤 · 다음 판. 사용자의 기록(konti:gmbest)은 갈무리했다 되돌린다. */
export default async function gameTest(){
  const T=[]; let pass=0, fail=0; const ok=(n,c,i)=>{ T.push({name:n,cond:c}); if(c)pass++; else{ fail++; console.warn('✗',n,i); } };
  const keep=localStorage.getItem('konti:gmbest'), keepD=localStorage.getItem('konti:gmdaily'), shown=KB.shown, lvl=GM.level, song=GM.song, tick=GM.tick, mode=GM.mode, swap=GM.swap; GM.mode='basic'; GM.swap=false;
  const W=ms=>new Promise(r=>setTimeout(r,ms));
  try{
    localStorage.removeItem('konti:gmbest'); showScreen('gm'); GM.tick=false;
    const press=m=>{ const k=gmKey(m), r=k.getBoundingClientRect(), o={pointerId:70+m,pointerType:'touch',clientX:r.left+r.width/2,clientY:r.top+r.height*.3,bubbles:true,cancelable:true};
      k.dispatchEvent(new PointerEvent('pointerdown',o)); setTimeout(()=>k.dispatchEvent(new PointerEvent('pointerup',o)),40); };
    // 데이터
    ok('판이 100개',GM_SONGS.length===100,GM_SONGS.length);
    ok('판 번호가 1..100 연속',GM_SONGS.every((s,i)=>s.no===i+1));
    { const hc=GM_SONGS.find(s=>s.id==='hotcross'), e=gmBlocks(hc), tot=e.blocks.reduce((m,b)=>Math.max(m,b.beat+b.dur),0), sc=GM_SONGS.find(s=>s.id==='sc_C');
      ok('짧은 곡은 되풀이해 48박 이상으로(v120)',e.reps>=2&&tot>=48,[e.reps,tot]);
      ok('음 수는 되풀이 횟수만큼',e.blocks.length===gmParse(hc).length*e.reps);
      ok('연습 곡은 그대로',gmBlocks(sc).reps===1);
      GM.song=hc; GM.level='easy'; gmReset(); gmHarmony(); ok('끝맺음 마디에 으뜸화음',!!GM.harm[Math.round(gmEndBar()/(hc.ts||4))]); }
    ok('id 가 겹치지 않는다',new Set(GM_SONGS.map(s=>s.id)).size===100);
    ok('난이도가 쉬운 것부터 정렬',GM_SONGS.every((s,i)=>i===0||GM_SONGS[i-1].lv<=s.lv));
    let dataOk=true;
    for(const s of GM_SONGS){ const bl=gmParse(s), n=s.n.split(/\s+/).filter(x=>x&&x!=='r'&&!x.startsWith('r:')).length, r=gmRangeOf(bl);
      if(bl.length!==n||r.nw<8||r.nw>15){ dataOk=false; ok('곡 「'+s.name+'」: 음 해석·건반 8~15개',false,[bl.length,n,r.nw]); } }
    ok('모든 곡: 음 해석 · 건반 8~15개',dataOk);
    ok('검은 건반이 나오는 곡이 5개 이상',GM_SONGS.filter(s=>gmParse(s).some(b=>gmIsBlack(b.m))).length>=5);
    // 건반 만들기: 검은 건반 위치
    GM.song=GM_SONGS.find(s=>s.id==='elise'); GM.level='easy'; gmReset();
    ok('엘리제: 흰·검은 건반이 만들어진다',document.querySelectorAll('#gmkeys .gk.w').length>=8&&document.querySelectorAll('#gmkeys .gk.b').length>=3&&!!gmKey(63));
    ok('검은 건반이 흰 건반 위에 있다(z-index)',+getComputedStyle(gmKey(63)).zIndex>+getComputedStyle(gmKey(64)).zIndex);
    // 쉬움(연습): 맞는 건반을 누를 때까지 기다려 준다
    GM.level='easy'; GM.song=GM_SONGS.find(s=>s.id==='clair'); gmReset(); gmStart();
    let t0=performance.now(), waited=false;
    while(!GM.done&&performance.now()-t0<150000){ await W(30); const h=document.querySelector('.gk.hint'); if(GM.waiting&&h){ waited=true; const T0=GM.T; await W(250); if(GM.T!==T0)ok('기다리는 동안 블록이 안 내려온다',false,[T0,GM.T]); press(+h.dataset.m); await W(120); } }
    ok('연습: 끝까지 가고 3별',GM.done&&document.getElementById('gmstars').textContent==='★★★',document.getElementById('gmstars').textContent);
    ok('연습: 기다려 준 적이 있다',waited);
    ok('연습: 기록이 저장된다',!!gmBest('clair','easy')&&gmBest('clair','easy').stars===3);
    ok('끝나면 「다음 판 ▶」이 보인다',!document.getElementById('gmnext').hidden);
    const no0=GM.song.no; gmNext(); ok('다음 판으로 넘어간다',GM.song.no===no0+1&&GM.started===true,GM.song.no); gmStop(false);
    // 검은 건반이 있는 곡도 연습 모드로 끝까지
    GM.level='easy'; GM.song=GM_SONGS.find(s=>s.id==='bk_star'); gmReset(); gmStart(); t0=performance.now();
    while(!GM.done&&performance.now()-t0<150000){ await W(30); const h=document.querySelector('.gk.hint'); if(GM.waiting&&h){ press(+h.dataset.m); await W(120); } }
    ok('검은 건반 곡(작은 별 ♯)을 연습 모드로 끝낸다',GM.done&&GM.wrong===0,[GM.done,GM.wrong]);
    // 보통: 박자대로 누르면 퍼펙트
    GM.level='normal'; GM.song=GM_SONGS.find(s=>s.id==='school'); gmReset(); gmStart();
    const pressed=new Set(); t0=performance.now();
    while(!GM.done&&performance.now()-t0<90000){ await W(10); for(const b of GM.blocks)if(!b.hit&&!b.gone&&!pressed.has(b)&&GM.T>=b.beat-.03){ pressed.add(b); press(b.m); } }
    ok('보통: 박자대로 누르면 거의 다 맞는다',GM.done&&GM.perfect+GM.good>=GM.blocks.length-1&&GM.miss<=1,[GM.perfect,GM.good,GM.miss]);
    ok('보통: 콤보가 쌓인다',GM.maxCombo>=10,GM.maxCombo);
    // 긴 음: 누르고 있는 동안 꼬리가 남고, 떼면 사라진다
    GM.level='normal'; GM.song=GM_SONGS.find(s=>s.id==='canon'); gmReset(); gmStart();
    { const b0=GM.blocks[0], k=gmKey(b0.m), r=k.getBoundingClientRect(), o={pointerId:99,pointerType:'touch',clientX:r.left+r.width/2,clientY:r.top+r.height*.3,bubbles:true,cancelable:true};
      t0=performance.now(); while(GM.T<b0.beat-.03&&performance.now()-t0<20000)await W(5);
      k.dispatchEvent(new PointerEvent('pointerdown',o)); await W(400);
      ok('긴 음: 누르는 동안 블록이 안 사라진다',b0.hit&&!b0.rel&&b0.dur>=1,[b0.hit,b0.rel]);
      k.dispatchEvent(new PointerEvent('pointerup',o)); await W(150);
      ok('긴 음: 일찍 떼면 꼬리가 끊긴다',b0.rel&&!b0.fin); gmStop(false); }
    // 놀이 방식(v112)
    { const pk=(k,ms)=>{ const r=k.getBoundingClientRect(), o={pointerId:200+Math.floor(Math.random()*1000),pointerType:'touch',clientX:r.left+r.width/2,clientY:r.top+r.height*.3,bubbles:true,cancelable:true}; k.dispatchEvent(new PointerEvent('pointerdown',o)); setTimeout(()=>k.dispatchEvent(new PointerEvent('pointerup',o)),ms||40); };
      // 리듬: 늘 첫 건반만 눌러도 박자만 맞으면 다 맞는다
      GM.mode='rhythm'; GM.swap=false; GM.level='normal'; GM.song=GM_SONGS.find(s=>s.id==='school'); gmReset(); gmStart();
      const k0=document.querySelector('#gmkeys .gk.w'), done=new Set(); t0=performance.now();
      while(!GM.done&&performance.now()-t0<90000){ await W(10); for(const b of GM.blocks)if(!b.hit&&!b.gone&&!done.has(b)&&GM.T>=b.beat-.03){ done.add(b); pk(k0); } }
      ok('리듬 모드: 한 건반만 박자에 맞춰 눌러도 거의 다 맞는다',GM.done&&GM.perfect+GM.good>=GM.blocks.length-1,[GM.perfect,GM.good,GM.miss]);
      // 대결: 점수가 1P·2P 로 나뉜다
      GM.mode='duel'; gmReset(); gmStart(); done.clear(); t0=performance.now();
      while(!GM.done&&performance.now()-t0<90000){ await W(10); for(const b of GM.blocks)if(!b.hit&&!b.gone&&!done.has(b)&&GM.T>=b.beat-.03){ done.add(b); pk(gmKey(b.m)); } }
      ok('대결 모드: 1P·2P 점수가 나뉘고 합이 전체 점수',GM.ds[0]>0&&GM.ds[1]>0&&GM.ds[0]+GM.ds[1]===GM.score,GM.ds);
      ok('대결 모드: 승자를 알린다',/승리|비겼/.test(document.getElementById('gmresult').textContent),document.getElementById('gmresult').textContent);
      // 악기 바꿔 치기
      GM.mode='basic'; GM.swap=true; gmReset(); gmStart(); await W(200); const k1=document.querySelector('#gmkeys .gk.w'); pk(k1); await W(80); const i1=KB.inst; pk(k1); await W(80);
      ok('악기 바꿔 치기: 누를 때마다 악기가 바뀐다',i1!==KB.inst,[i1,KB.inst]); gmStop(false); GM.swap=false; KB.inst='piano';
      // 오늘의 도전
      const d1=gmDailyPick(), d2=gmDailyPick(); ok('오늘의 도전: 같은 날은 같은 곡',d1.song===d2.song&&!!d1.song&&!!GM_LEVELS[d1.level]);
      gmDailyStart(); ok('오늘의 도전: 고르면 그 곡·난이도로',GM.daily&&GM.song===d1.song&&GM.level===d1.level);
      GM.daily=false; GM.mode='basic'; GM.swap=false;
      // 내 노래
      const keepSM=SM.notes; SM.notes=[{m:60,on:0,dur:1,ly:''},{m:64,on:2,dur:2,ly:''}];
      const my=gmMySong(); ok('내 노래: 노래 만들기의 곡이 게임 판이 된다',my&&my.n==='C4:1 r:1 E4:2'&&gmParse(my).length===2,my&&my.n);
      SM.notes=keepSM; }
    // 아무것도 안 누르면 전부 미스
    GM.song=GM_SONGS.find(s=>s.id==='hotcross'); gmReset(); gmStart(); t0=performance.now();
    while(!GM.done&&performance.now()-t0<150000)await W(100);
    ok('안 누르면 전부 미스 · 별 0',GM.done&&GM.miss===GM.blocks.length&&document.getElementById('gmstars').textContent==='☆☆☆',[GM.miss,GM.blocks.length]);
    // 팝업: 곡 목록은 화면 전체를 덮는 팝업이고 스크롤된다
    gmReset(); document.getElementById('gmsong').click(); await W(100);
    const pop=document.getElementById('gmpop'), body=document.getElementById('gmpopbody');
    ok('곡 고르기가 팝업(fixed)으로 뜬다',!pop.hidden&&getComputedStyle(pop).position==='fixed');
    ok('목록에 100곡',body.querySelectorAll('[data-id]').length===100);
    ok('목록이 스크롤된다(세로 드래그 허용)',body.scrollHeight>body.clientHeight+200&&getComputedStyle(body).touchAction==='pan-y'&&getComputedStyle(body).overflowY==='auto',[body.scrollHeight,body.clientHeight]);
    document.querySelector('#gmtabs [data-c="클래식"]').click(); await W(50);
    ok('분류 탭: 클래식만 보인다',[...body.querySelectorAll('.gmrow:not(.gmdailyrow) .nm small')].every(e=>e.textContent.startsWith('클래식')),body.children.length);
    document.querySelector('#gmtabs [data-c="전체"]').click(); await W(50);
    body.querySelector('[data-id="elise"]').click(); await W(50);
    ok('곡을 고르면 팝업이 닫히고 곡이 바뀐다',pop.hidden&&GM.song.id==='elise');
    // 난이도 목록
    document.getElementById('gmlevel').click(); await W(50);
    ok('난이도도 목록(팝업)에서 고른다',!document.getElementById('gmlvpop').hidden&&document.querySelectorAll('#gmlvbody [data-k]').length===5);
    document.querySelector('#gmlvbody [data-k="hard"]').click(); await W(50);
    ok('난이도를 고르면 적용된다',GM.level==='hard'&&document.getElementById('gmlvpop').hidden&&localStorage.getItem('konti:gmlevel')==='hard');
    showScreen('home');
    ok('나가면 게임이 멈추고 건반 악기가 되돌아간다',GM.started===false&&KB.inst===(GM.prevInst||KB.inst));
  }finally{
    if(keep===null)localStorage.removeItem('konti:gmbest'); else localStorage.setItem('konti:gmbest',keep);
    GM.level=lvl; GM.song=song; GM.tick=tick; GM.mode=mode; GM.swap=swap; GM.daily=false; if(keepD===null)localStorage.removeItem('konti:gmdaily'); else localStorage.setItem('konti:gmdaily',keepD); try{ localStorage.setItem('konti:gmlevel',lvl); localStorage.setItem('konti:gmtick',tick?'1':'0'); }catch(e){} showScreen(shown==='gm'?'home':shown);
  }
  console.table(T.map(t=>({검사:t.name,결과:t.cond?'통과':'실패'})));
  console.log((fail?'✗ ':'✓ ')+'game: '+pass+' 통과 / '+fail+' 실패');
  return {pass,fail};
}
