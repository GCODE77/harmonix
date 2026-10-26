/* 연습 모드·백업 회귀 테스트 (v152).  앱을 http 로 열고 콘솔에:  const m=await import('./test/prac.test.js'); await m.default();
   속도(BPM %)·구간 반복(마디 A~B 되감기)·박자 세기·백업 만들기/불러오기. 사용자의 저장 내용은 갈무리했다 되돌린다. */
export default async function pracTest(){
  const T=[]; let pass=0, fail=0; const ok=(n,c,i)=>{ T.push({name:n,cond:c}); if(c)pass++; else{ fail++; console.warn('✗',n,i); } };
  const W=ms=>new Promise(r=>setTimeout(r,ms)), saveRaw=S.raw, realSave=window.scheduleSave, keepBk=localStorage.getItem('konti:bkat'), keepCI=localStorage.getItem('konti:countin');
  window.scheduleSave=()=>{};
  try{
    showScreen('score');
    S.raw='[C]하나 [G]둘 [Am]셋 [F]넷\n[C]다섯 [G]여섯 [Am]일곱 [F]여덟'; reparse(); renderAll();
    const tl=buildTimeline(), N=tl.bars.length; ok('마디 목록이 있다',N>=8,N);
    // 속도
    setBpm(80); pracSpeed(.5); ok('50% → BPM 40, 원래 80 을 기억',P.bpm===40&&P.pBase===80,[P.bpm,P.pBase]);
    pracSpeed(.75); ok('75% 는 원래 기준(60)',P.bpm===60,P.bpm);
    pracSpeed(1); ok('100% 는 원래대로, 기억은 지운다',P.bpm===80&&!P.pBase,[P.bpm,P.pBase]);
    pracSpeed(.5); setBpm(95); ok('BPM 을 손으로 고치면 원래 속도 기억을 지운다',!P.pBase&&P.bpm===95,[P.bpm,P.pBase]); setBpm(120);
    // 구간 반복
    ok('잘못된 구간은 거부',pracLoop(true,5,3)===false&&!P.ab);
    ok('3~4마디 반복 켜기',pracLoop(true,3,4)&&P.ab&&Math.abs(P.ab.end-P.ab.s-tl.bars[2].beats-tl.bars[3].beats)<1e-6,P.ab);
    startPlay(true); const beats=[]; const spb=60/P.bpm;
    await W(Math.round(spb*(P.ab.end-P.ab.s)*2.2*1000)+800);   // 구간 두 번 이상
    const ats=P.bmarks.map(b=>b.at); const maxAt=Math.max(...ats);
    ok('재생이 구간 밖으로 나가지 않는다(끝 박 이하)',maxAt<P.ab.end+1e-6,[maxAt,P.ab.end]);
    ok('구간 시작 박이 되풀이로 기록된다',P.k>=0&&P.bmarks.some(b=>Math.abs(b.at-P.ab.s)<1e-6),ats.join());
    stopPlay(); pracLoop(false); ok('반복 끄기',P.ab===null);
    // 박자 세기: 켜면 시작이 한 마디 뒤
    P.countIn=false; startPlay(); const t0a=P.t0-actx.currentTime; stopPlay(); P.countIn=true; startPlay(); const t0b=P.t0-actx.currentTime; stopPlay();
    ok('박자 세기를 켜면 음악 시작이 한 마디(≈'+(P.beats*60/P.bpm).toFixed(1)+'초) 늦어진다',Math.abs((t0b-t0a)-P.beats*60/P.bpm)<.05,[t0a,t0b]);
    P.countIn=false;
    // 패널
    openPanel('prac'); ok('연습 탭이 열린다',!!document.getElementById('pracsp')&&document.querySelectorAll('#pracsp [data-sp]').length===5); closePanel();
    // 백업
    localStorage.setItem('konti:__bktest','{"a":1}'); localStorage.setItem('konti:apikey','SECRET');
    const bk=bkBuild(); ok('백업에 konti 항목이 들어간다',bk.app==='harmonix'&&bk.data['konti:__bktest']==='{"a":1}');
    ok('API 키는 백업에 안 들어간다',!('konti:apikey' in bk.data)&&!JSON.stringify(bk).includes('SECRET'));
    localStorage.setItem('konti:__bktest','changed'); ok('불러오기가 값을 되돌린다',bkApply(JSON.stringify(bk))>0&&localStorage.getItem('konti:__bktest')==='{"a":1}');
    ok('엉뚱한 파일은 거부',bkApply('{"hello":1}')===-1&&bkApply('not json')===-1);
    ok('요약이 만들어진다',/저장한 곡/.test(bkSummary()));
    document.getElementById('hbk').click(); ok('백업 창이 열린다',!document.getElementById('bkpop').hidden); document.getElementById('bkx').click();
  }finally{
    window.scheduleSave=realSave; P.ab=null; P.pBase=0; P.countIn=false; try{ stopPlay(); }catch(e){}
    localStorage.removeItem('konti:__bktest'); if(keepBk===null)localStorage.removeItem('konti:bkat'); else localStorage.setItem('konti:bkat',keepBk);
    if(keepCI===null)localStorage.removeItem('konti:countin'); else localStorage.setItem('konti:countin',keepCI);
    S.raw=saveRaw; reparse(); showScreen('home');
  }
  console.table(T.map(t=>({검사:t.name,결과:t.cond?'통과':'실패'})));
  console.log((fail?'✗ ':'✓ ')+'prac: '+pass+' 통과 / '+fail+' 실패');
  return {pass,fail};
}
