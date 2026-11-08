"""하모닉스 APK 만들기 (안드로이드 SDK 도구만 사용, Gradle 불필요).

    python android/build_apk.py            # 가벼운 판(약 2MB) — 악기 샘플은 인터넷에서 받는다
    python android/build_apk.py --vendor   # vendor/ 까지 넣은 완전 오프라인 판(약 60MB)

결과: 저장소 맨 위의 harmonix.apk  (앱의 「📲 앱 설치」 창에서 내려받는 파일)
필요: JDK 17, Android SDK(build-tools·platforms). ANDROID_HOME 이 없으면 %LOCALAPPDATA%\\Android\\Sdk.
서명 키(android/harmonix.keystore)는 처음 한 번 만들고 계속 쓴다 — 같은 키여야 덮어 설치(업데이트)가 된다. 저장소에 올리지 말 것(.gitignore).
"""
import os, sys, shutil, subprocess, zipfile, glob, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'harmonix.apk')
# aapt2/javac 는 한글 경로를 못 열어서(ANSI 코드페이지) 영문 임시 폴더에서 빌드한다
import tempfile
BUILD = os.path.join(tempfile.gettempdir(), 'harmonix_apk_build')
WITH_VENDOR = '--vendor' in sys.argv

sdk = os.environ.get('ANDROID_HOME') or os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Android', 'Sdk')
bt = sorted(glob.glob(os.path.join(sdk, 'build-tools', '*')), key=lambda p: [int(x) if x.isdigit() else 0 for x in re.split(r'\D+', os.path.basename(p))])[-1]
plat = sorted(glob.glob(os.path.join(sdk, 'platforms', 'android-*')), key=lambda p: int(re.sub(r'\D', '', os.path.basename(p)) or 0))
plat = [p for p in plat if os.path.exists(os.path.join(p, 'android.jar'))][-1]
JAR = os.path.join(plat, 'android.jar')
exe = '.exe' if os.name == 'nt' else ''
bat = '.bat' if os.name == 'nt' else ''
AAPT2 = os.path.join(bt, 'aapt2' + exe)
D8 = os.path.join(bt, 'd8' + bat)
ZIPALIGN = os.path.join(bt, 'zipalign' + exe)
APKSIGNER = os.path.join(bt, 'apksigner' + bat)

# 버전: index.html 의 service worker 이름 harmonix-vNNN 에서 읽는다
sw = open(os.path.join(ROOT, 'sw.js'), encoding='utf-8').read()
m = re.search(r"harmonix-v(\d+)", sw)
VER = int(m.group(1)) if m else 1


def run(*a):
    print('>', ' '.join(os.path.basename(x) if os.path.isabs(x) else x for x in a)[:160])
    subprocess.run(list(a), check=True, shell=False)


if os.path.exists(BUILD):
    shutil.rmtree(BUILD, ignore_errors=True)
for d in ('assets', 'res', 'classes', 'dex'):
    os.makedirs(os.path.join(BUILD, d))

# 1) 웹 파일을 assets 로 (index.html 한 벌 — 웹판과 같은 코드)
A = os.path.join(BUILD, 'assets')
for f in ('index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'favicon.png', 'apple-touch-icon.png'):
    shutil.copy(os.path.join(ROOT, f), A)
if WITH_VENDOR:
    v = os.path.join(ROOT, 'vendor')
    if not os.path.isdir(v):
        sys.exit('vendor/ 가 없어요 — python desktop/fetch_vendor.py 로 먼저 받으세요')
    shutil.copytree(v, os.path.join(A, 'vendor'), ignore=shutil.ignore_patterns('*.none'))

# 2) 리소스 컴파일 + 링크(매니페스트·assets)
shutil.copytree(os.path.join(HERE, 'res'), os.path.join(BUILD, 'resin'))
shutil.copytree(os.path.join(HERE, 'src'), os.path.join(BUILD, 'src'))
shutil.copy(os.path.join(HERE, 'AndroidManifest.xml'), os.path.join(BUILD, 'AndroidManifest.xml'))
run(AAPT2, 'compile', '--dir', os.path.join(BUILD, 'resin'), '-o', os.path.join(BUILD, 'res.zip'))
base = os.path.join(BUILD, 'base.apk')
run(AAPT2, 'link', '-o', base, '-I', JAR, '--manifest', os.path.join(BUILD, 'AndroidManifest.xml'), '-A', A,
    '--min-sdk-version', '24', '--target-sdk-version', '34', '--version-code', str(VER), '--version-name', '1.%d' % VER,
    os.path.join(BUILD, 'res.zip'))

# 3) 자바 컴파일 → dex
srcs = glob.glob(os.path.join(BUILD, 'src', '**', '*.java'), recursive=True)
run('javac', '-encoding', 'UTF-8', '--release', '8', '-Xlint:-options', '-cp', JAR, '-d', os.path.join(BUILD, 'classes'), *srcs)
classes = glob.glob(os.path.join(BUILD, 'classes', '**', '*.class'), recursive=True)
run(D8, '--lib', JAR, '--min-api', '24', '--output', os.path.join(BUILD, 'dex'), *classes)

# 4) dex 를 apk 에 넣기
with zipfile.ZipFile(base, 'a') as z:
    z.write(os.path.join(BUILD, 'dex', 'classes.dex'), 'classes.dex')

# 5) 정렬 → 서명
aligned = os.path.join(BUILD, 'aligned.apk')
run(ZIPALIGN, '-f', '-p', '4', base, aligned)
ks = os.path.join(HERE, 'harmonix.keystore')
kpf = os.path.join(HERE, 'harmonix.keystore.pass')   # 서명 키 비밀번호 — 로컬 파일(.gitignore). 없으면 새 키와 함께 무작위로 만든다
if not os.path.exists(ks):
    import secrets
    open(kpf, 'w').write(secrets.token_hex(12))
KP = open(kpf).read().strip()
if not os.path.exists(ks):
    run('keytool', '-genkeypair', '-keystore', os.path.join(BUILD, 'new.keystore'), '-storepass', KP, '-keypass', KP, '-alias', 'harmonix',
        '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Harmonix, O=GLORY, C=KR')
    shutil.copy(os.path.join(BUILD, 'new.keystore'), ks)
ks_tmp = os.path.join(BUILD, 'k.keystore'); shutil.copy(ks, ks_tmp)
signed = os.path.join(BUILD, 'harmonix.apk')
run(APKSIGNER, 'sign', '--ks', ks_tmp, '--ks-pass', 'pass:' + KP, '--key-pass', 'pass:' + KP, '--out', signed, aligned)
run(APKSIGNER, 'verify', signed)
shutil.copy(signed, OUT)
print('완료: %s (%.1f MB, versionCode %d)' % (OUT, os.path.getsize(OUT) / 1048576, VER))
