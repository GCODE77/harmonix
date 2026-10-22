/* 폴짝 산책 회귀 테스트 (v146).  앱을 http 로 열고 콘솔에:  const m=await import('./test/wk.test.js'); await m.default();
   소리→높이 변환 · 잘 부르는 사람은 끝까지 · 소리를 안 내면 부딪혀 끝 · 게임 중 설정 창이 게임을 멈춘다. 마이크는 쓰지 않는다(wkHear 를 바꿔 끼운다). */
export default async function wkTest(){
  const T=[]; let pass=0, fail=0; const ok=(n,c,i)=>{ T.push({name:n,cond:c}); if(c)pass++; else{ fail++; console.warn('✗',n,i); } };
  const W=ms=>new Promise(r=>setTimeout(r,ms)), keep=localStorage.getItem('konti:wkbest'), keepCal=localStorage.getItem('konti:wkcal'), realHear=window.wkHear, realMic=window.wkMic, st={lv:WK.lv,bgm:WK.bgm}, goal=WK_LV.easy.goal;
  try{
    ok('작은 소리 + 낮은 음 → 낮게',wkHeightOf(.1,.1)<.3); ok('큰 소리 → 높게(음 높이 없이도)',wkHeightOf(1,null)>.85);
    ok('높은 음 → 작은 소리라도 높게',wkHeightOf(.1,1)>.85); ok('둘 다 크고 높으면 가장 높게(맨 위 장애물을 넘는다)',wkHeightOf(1,1)>=1.0);
    showScreen('wk'); window.wkMic=async()=>true; WK.bgm='off'; WK.lv='easy'; WK_LV.easy.goal=60;
    /* 잘 부르는 사람: 앞 장애물을 넘을 만큼만 소리 낸다(새는 아래로 지나간다) */
    window.wkHear=()=>{ const dx=WK.W*.2, ob=WK.obs.find(o=>!o.done&&o.x>dx-WK.W*.05&&o.x<dx+WK.W*.28);
      if(!ob)return {on:false,h:0,raw:.02,mf:null,volN:0}; if(ob.k==='bird')return {on:false,h:0,raw:0,mf:null,volN:0};
      return {on:true,h:Math.min(1.05,ob.h+.15),raw:.04,mf:60,volN:.5}; };
    await wkStart('quick'); let t0=performance.now(); while(!WK.over&&performance.now()-t0<150000)await W(100);
    ok('잘 부르면 끝까지 걷는다(도착)',WK.over&&WK.dist>=60&&WK.hearts>=1,[WK.dist,WK.hearts,WK.hitN]);
    ok('아이템(별)을 먹었다',WK.stars>0,WK.stars);
    await W(1700); ok('끝나면 결과 창',!document.getElementById('wkend').hidden&&/★/.test(document.getElementById('wkstars').textContent));
    /* 소리를 안 내면 */
    WK_LV.easy.goal=900; window.wkHear=()=>({on:false,h:0,raw:0,mf:null,volN:0});
    await wkStart('quick'); t0=performance.now(); while(!WK.over&&performance.now()-t0<150000)await W(100);
    ok('소리를 안 내면 부딪혀 끝난다',WK.over&&WK.hearts<=0,[WK.hearts,WK.dist]);
    /* 게임 중 설정: 멈추고, 감도를 바꾸면 바로 적용되고, 닫으면 이어진다 */
    window.wkHear=()=>({on:false,h:0,raw:0,mf:null,volN:0}); WK_LV.easy.goal=900; await wkStart('quick'); await W(3800);
    const d0=WK.dist; document.getElementById('wkset').click(); await W(300);
    ok('설정 창이 뜨고 게임이 멈춘다',WK.setOpen&&WK.paused&&!document.getElementById('wksetp').hidden);
    ok('설정 창 안에 마이크 감도가 있다',!!document.querySelector('#wksethost #wksens')&&getComputedStyle(document.querySelector('#wksethost #wklv').parentElement).display==='none');
    const d1=WK.dist; await W(400); ok('멈춘 동안 거리가 안 는다',Math.abs(WK.dist-d1)<.01,[d1,WK.dist]);
    const s=document.getElementById('wksens'); s.value='high'; s.onchange(); ok('감도 변경이 바로 적용',Math.abs(WK.sens-WK_SENS.high)<1e-6);
    document.getElementById('wksetgo').click(); await W(300);
    ok('닫으면 이어서 진행',!WK.setOpen&&!WK.paused&&document.querySelector('#wk .vbdet #wksens')!=null);
    showScreen('home'); ok('나가면 멈춘다',!WK.started);
  }finally{
    window.wkHear=realHear; window.wkMic=realMic; Object.assign(WK,st); WK_LV.easy.goal=goal; WK.started=false; cancelAnimationFrame(WK.raf); WK.sens=WK_SENS[localStorage.getItem('konti:wksens')||'mid']||1;
    if(keep===null)localStorage.removeItem('konti:wkbest'); else localStorage.setItem('konti:wkbest',keep);
    if(keepCal===null)localStorage.removeItem('konti:wkcal'); else localStorage.setItem('konti:wkcal',keepCal);
  }
  console.table(T.map(t=>({검사:t.name,결과:t.cond?'통과':'실패'})));
  console.log((fail?'✗ ':'✓ ')+'wk: '+pass+' 통과 / '+fail+' 실패');
  return {pass,fail};
}
