/* 건반 녹음 저장·불러오기 + 튜너 악기 목록 회귀 테스트 (v105).
   앱을 http 로 열고 콘솔에:  const m=await import('./test/kbrec.test.js'); await m.default();
   ★ 사용자의 저장 녹음(konti:kbrecs·konti:kblast)·튜너 설정을 건드리므로 시작할 때 갈무리했다가 끝나면 되돌린다(38번·73번 규칙). */
export default async function kbrecTest(){
  const T=[]; let pass=0, fail=0;
  const ok=(name,cond,info)=>{ T.push({name,cond}); if(cond)pass++; else{ fail++; console.warn('✗',name,info); } };
  const keep={recs:localStorage.getItem('konti:kbrecs'), last:localStorage.getItem('konti:kblast'), pre:TN.pre, notes:KB.rec.notes, bpm:KB.rec.bpm, prompt:window.prompt, confirm:window.confirm, shown:KB.shown};
  try{
    localStorage.removeItem('konti:kbrecs'); localStorage.removeItem('konti:kblast');
    showScreen('kb');
    window.prompt=(m,d)=>'시험 녹음'; window.confirm=()=>true;
    const mk=(m,t0,t1)=>({k:'n',m,pad:null,t0,t1,v:.8,inst:'piano'});
    KB.rec.notes=[mk(60,0,400),mk(64,500,900),mk(67,1000,1500)]; KB.rec.bpm=100; KB.rec.on=false;
    // 1) 저장
    kbSaveRec();
    let L=kbRecsGet();
    ok('저장하면 목록에 하나 생긴다',L.length===1&&L[0].name==='시험 녹음',L);
    ok('저장본에 음·빠르기·길이가 들어 있다',L[0].notes.length===3&&L[0].bpm===100&&L[0].dur===1500,L[0]);
    kbSaveRec(); L=kbRecsGet();
    ok('여러 번 저장하면 쌓인다(최신이 앞)',L.length===2&&L[0].at>=L[1].at,L.length);
    // 2) 자동 저장
    KB.rec.on=true; KB.rec.t0=kbNow(); kbRecStop();
    ok('녹음을 멈추면 마지막 녹음이 자동으로 남는다',(JSON.parse(localStorage.getItem('konti:kblast')||'{}').notes||[]).length===3);
    // 3) 불러오기
    KB.rec.notes=[]; KB.rec.bpm=90;
    kbLoadRec(L[0],false);
    ok('불러오면 음과 빠르기가 되살아난다',KB.rec.notes.length===3&&KB.rec.bpm===100,KB.rec.notes.length);
    ok('불러온 뒤 건반을 눌러도 불러온 음이 지워지지 않는다(자동 새 녹음 막음)',KB.rec.autoDone===false);
    // 4) 목록 화면
    kbRecListOpen();
    ok('목록에 저장한 녹음과 마지막 녹음이 모두 보인다',document.querySelectorAll('#kbrecpopbody .kbrecrow').length===3);
    $('kbrecpop').hidden=true;
    // 5) 지우기
    kbRecsPut(kbRecsGet().filter(x=>x.id!==L[0].id));
    ok('지우면 목록에서 빠진다',kbRecsGet().length===1);
    // 6) 40개 한도
    const many=[]; for(let i=0;i<45;i++)many.push({id:'x'+i,name:'n'+i,at:i,bpm:90,notes:[mk(60,0,100)],dur:100});
    kbRecsPut(many); KB.rec.notes=[mk(60,0,100)]; kbSaveRec();
    ok('저장은 최대 40개까지만 남긴다',kbRecsGet().length<=40,kbRecsGet().length);
    // 7) 재생선
    KB.rec.notes=[mk(60,0,400),mk(64,500,900)]; kbRecUI(); kbRenderStaff();
    ok('큰보표에 재생선(#kbph)이 있다',!!document.getElementById('kbph'));
    // 8) 튜너 악기 목록
    for(const k of ['violin','viola','cello','bass5','uke','mandolin','banjo','guitar7','dbass']){
      TN.pre=k; tnStrings();
      ok('튜너 '+k+': 줄 카드가 줄 수만큼 나온다',document.querySelectorAll('#tngtr .peg').length===TN_PRE[k][1].length,k);
    }
    TN.pre='guitar'; tnStrings();
    ok('기타 6줄은 헤드스톡 그림',!document.getElementById('tngtr').classList.contains('gen')&&document.querySelectorAll('#tngtr .gh s').length===6);
    TN.pre='chrom'; tnStrings();
    ok('자유 모드는 줄 카드가 숨는다',document.getElementById('tngtr').hidden===true);
  }finally{
    if(keep.recs===null)localStorage.removeItem('konti:kbrecs'); else localStorage.setItem('konti:kbrecs',keep.recs);
    if(keep.last===null)localStorage.removeItem('konti:kblast'); else localStorage.setItem('konti:kblast',keep.last);
    TN.pre=keep.pre; tnStrings(); KB.rec.notes=keep.notes; KB.rec.bpm=keep.bpm; window.prompt=keep.prompt; window.confirm=keep.confirm;
    kbRecUI(); showScreen(keep.shown==='kb'?'kb':'home');
  }
  console.table(T.map(t=>({검사:t.name,결과:t.cond?'통과':'실패'})));
  console.log((fail?'✗ ':'✓ ')+'kbrec: '+pass+' 통과 / '+fail+' 실패');
  return {pass,fail};
}
