/* 드럼 연습 + 노래하는 새 쉬는 동안 유지 회귀 테스트 (v121).  앱을 http 로 열고 콘솔에:  const m=await import('./test/dr.test.js'); await m.default();
   ① 박자에 맞춰 치면 별 3개·전부 완벽 ② 안 치면 전부 놓침·별 0 ③ 먼저 듣기는 점수 없이 끝나고 다시 시작 창 ④ 쉬움은 하이햇 줄을 직접 안 친다 ⑤ 자유 연주 비트 켜고 끄기
   ⑥ 나가면 멈춘다 ⑦ 새: 효과음으로 마이크를 쉬는 동안 새가 떨어지지 않는다. */
export default async function drTest(){
  const T=[]; let pass=0, fail=0; const ok=(n,c,i)=>{ T.push({name:n,cond:c}); if(c)pass++; else{ fail++; console.warn('✗',n,i); } };
  const W=ms=>new Promise(r=>setTimeout(r,ms)), keepBest=localStorage.getItem('konti:drbest'), st={lv:DR.lv,bpm:DR.bpm,pat:DR.pat,mode:DR.mode};
  try{
    showScreen('dr'); await W(200);
    ok('드럼 화면이 뜬다',!document.getElementById('dr').hidden&&!document.getElementById('drstart').hidden);
    ok('박자 틀 9단계',DR_PATS.length===9&&document.getElementById('drpat').options.length===9);
    // ① 정확히 치는 사람
    drSetPat(0); DR.lv='normal'; DR.bpm=140; drStart(false);
    let t0=performance.now(), done=new Set();
    while(DR.run&&performance.now()-t0<30000){ await W(4); const now=performance.now(); for(const n of DR.notes){ if(n.state===0&&!done.has(n)&&now>=n.t){ done.add(n); drPadDown(n.lane); } } }
    ok('정확히 치면 전부 완벽',DR.perf===32&&DR.miss===0,[DR.perf,DR.good,DR.miss]);
    ok('별 3개 · 결과 창',!document.getElementById('drend').hidden&&/★★★/.test(document.getElementById('drstars').textContent));
    ok('기록 저장',JSON.parse(localStorage.getItem('konti:drbest')||'{}')['l1:normal']===3);
    // ② 안 치는 사람
    drSetPat(1,true); DR.bpm=200; drStart(false); t0=performance.now(); while(DR.run&&performance.now()-t0<30000)await W(50);
    ok('안 치면 전부 놓침 · 별 0',DR.perf===0&&DR.miss===32&&/☆☆☆/.test(document.getElementById('drstars').textContent),[DR.perf,DR.miss]);
    // ④ 쉬움 = 하이햇 자동
    drSetPat(2,true); DR.lv='easy'; DR.bpm=200; drStart(false);
    ok('쉬움: 하이햇 줄은 직접 안 친다',drTotal()===32&&DR.notes.every(n=>n.lane!==0||n.auto),drTotal());
    drStop();
    DR.lv='normal'; drStart(false); ok('보통: 세 줄 모두 직접',drTotal()===DR_BARS*(2+2+8),drTotal()); drStop();
    // ③ 먼저 듣기
    drSetPat(0); DR.bpm=200; drStart(true); ok('먼저 듣기는 직접 칠 음표 없음',drTotal()===0); t0=performance.now(); while(DR.run&&performance.now()-t0<30000)await W(50);
    ok('먼저 듣기가 끝나면 시작 창',!document.getElementById('drstart').hidden&&document.getElementById('drend').hidden);
    // ⑤ 자유 연주
    drSetMode('free'); document.getElementById('drbeat').click(); await W(400);
    ok('자유 연주 비트 켜짐 · 칸 표시',DR.beatOn&&document.querySelectorAll('#drgrid .drcell.on').length===4&&document.querySelectorAll('#drpads .drpad').length===8);
    document.getElementById('drbeat').click(); ok('비트 끄기',!DR.beatOn);
    // ⑥ 나가기
    drSetMode('play'); drStart(false); showScreen('home'); ok('나가면 멈춘다',!DR.run&&!DR.beatOn&&document.getElementById('dr').hidden);
    // ⑦ 새: 마이크를 쉬는 동안 유지
    showScreen('vb'); const realHear=window.vbHear, realMic=window.vbMic; window.vbMic=async()=>true; VB.hint=false; VB.lv='easy'; VB.song='random';
    window.vbHear=()=>VB.mute>0?null:60+7;   // 솔을 계속 부르는 사람(쉬는 동안엔 못 듣는다)
    await vbStart(); await W(3600); const before=VB.pos; VB.mute=.6; const lo=[VB.pos]; for(let i=0;i<5;i++){ await W(100); lo.push(VB.pos); }
    ok('마이크를 쉬는 동안(0.5초) 새가 떨어지지 않는다',Math.min(...lo)>before-.3&&VB.voice!=null,lo);
    window.vbHear=realHear; window.vbMic=realMic; showScreen('home');
  }finally{
    if(keepBest===null)localStorage.removeItem('konti:drbest'); else localStorage.setItem('konti:drbest',keepBest);
    DR.lv=st.lv; DR.bpm=st.bpm; DR.pat=st.pat; DR.mode=st.mode; drStop(); vbStop&&vbStop();
  }
  console.table(T.map(t=>({검사:t.name,결과:t.cond?'통과':'실패'})));
  console.log((fail?'✗ ':'✓ ')+'dr: '+pass+' 통과 / '+fail+' 실패');
  return {pass,fail};
}
