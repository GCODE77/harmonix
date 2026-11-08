package com.gcode77.harmonix;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * 하모닉스 안드로이드 앱 — 웹판(index.html)을 그대로 담은 웹뷰 껍데기.
 * 파일은 assets/ 에 들어 있고 https://appassets.local/ 주소로 앱 안에서 직접 내준다(인터넷 없이도 열린다).
 * 마이크(튜너·노래 만들기·새 게임), 사진/파일 고르기(악보 가져오기), 파일 저장(MIDI·백업)을 이어 준다.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.local";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final int REQ_FILE = 1, REQ_MIC = 2;

    private WebView web;
    private ValueCallback<Uri[]> filePathCb;
    private PermissionRequest pendingPerm;

    /** 웹판의 blob:/data: 다운로드(a[download])를 가로채 앱의 저장 함수로 보낸다. */
    private static final String DL_JS =
        "(function(){if(window.__hxdl)return;window.__hxdl=1;"
        + "function send(a){var name=a.getAttribute('download')||'file';fetch(a.href).then(function(r){return r.blob();}).then(function(b){"
        + "var fr=new FileReader();fr.onload=function(){var s=String(fr.result);var i=s.indexOf(',');"
        + "HarmonixAndroid.saveFile(name,b.type||'application/octet-stream',s.substring(i+1));};fr.readAsDataURL(b);});}"
        + "var oc=HTMLAnchorElement.prototype.click;"
        + "HTMLAnchorElement.prototype.click=function(){if(this.hasAttribute('download')&&/^(blob:|data:)/.test(this.href)){send(this);return;}return oc.apply(this,arguments);};"
        + "document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[download]');"
        + "if(a&&/^(blob:|data:)/.test(a.href)){e.preventDefault();send(a);}},true);})();";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(0xFF131A23);
        setContentView(web);
        immersive();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setBuiltInZoomControls(false);
        s.setSupportZoom(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString() + " HarmonixApp/1");

        web.addJavascriptInterface(new Bridge(), "HarmonixAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return serve(u);
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                String sc = u.getScheme();
                if ("http".equals(sc) || "https".equals(sc) || "mailto".equals(sc)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { }
                }
                return true;
            }

            @Override
            public void onPageStarted(WebView v, String url, android.graphics.Bitmap f) { v.evaluateJavascript(DL_JS, null); }

            @Override
            public void onPageFinished(WebView v, String url) { v.evaluateJavascript(DL_JS, null); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest req) {
                runOnUiThread(new Runnable() {
                    public void run() {
                        if (!HOST.equals(req.getOrigin().getHost())) { req.deny(); return; }
                        boolean wantMic = false;
                        for (String r : req.getResources()) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) wantMic = true;
                        }
                        if (!wantMic) { req.deny(); return; }
                        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                            req.grant(new String[]{ PermissionRequest.RESOURCE_AUDIO_CAPTURE });
                        } else {
                            if (pendingPerm != null) pendingPerm.deny();
                            pendingPerm = req;
                            requestPermissions(new String[]{ Manifest.permission.RECORD_AUDIO }, REQ_MIC);
                        }
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (filePathCb != null) filePathCb.onReceiveValue(null);
                filePathCb = cb;
                try {
                    startActivityForResult(p.createIntent(), REQ_FILE);
                } catch (Exception e) {
                    filePathCb = null;
                    return false;
                }
                return true;
            }
        });
        web.loadUrl(START_URL);
    }

    private WebResourceResponse serve(Uri u) {
        String path = u.getPath();
        if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
        path = path.substring(1);
        if (path.contains("..")) return notFound();
        try {
            InputStream in = getAssets().open(path);
            Map<String, String> h = new HashMap<String, String>();
            h.put("Access-Control-Allow-Origin", "*");
            h.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mime(path), "utf-8", 200, "OK", h, in);
        } catch (IOException e) {
            return notFound();
        }
    }

    private WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
            new HashMap<String, String>(), new java.io.ByteArrayInputStream(new byte[0]));
    }

    private static String mime(String p) {
        String q = p.toLowerCase(Locale.ROOT);
        if (q.endsWith(".html")) return "text/html";
        if (q.endsWith(".js") || q.endsWith(".mjs")) return "application/javascript";
        if (q.endsWith(".css")) return "text/css";
        if (q.endsWith(".json") || q.endsWith(".webmanifest")) return "application/json";
        if (q.endsWith(".png")) return "image/png";
        if (q.endsWith(".jpg") || q.endsWith(".jpeg")) return "image/jpeg";
        if (q.endsWith(".svg")) return "image/svg+xml";
        if (q.endsWith(".mp3")) return "audio/mpeg";
        if (q.endsWith(".wasm")) return "application/wasm";
        if (q.endsWith(".gz")) return "application/gzip";
        if (q.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    /** 웹판의 「저장」(MIDI·백업·그림)을 폰의 다운로드 폴더에 넣는다. */
    private class Bridge {
        @JavascriptInterface
        public void saveFile(final String name, final String mimeType, final String base64) {
            try {
                byte[] data = Base64.decode(base64, Base64.DEFAULT);
                String safe = name.replaceAll("[\\\\/:*?\"<>|]", "_");
                String where;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                    cv.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                    cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    OutputStream os = getContentResolver().openOutputStream(uri);
                    os.write(data);
                    os.close();
                    where = "다운로드 폴더";
                } else {
                    File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    File f = new File(dir, safe);
                    FileOutputStream os = new FileOutputStream(f);
                    os.write(data);
                    os.close();
                    where = f.getParent();
                }
                final String msg = "저장했어요: " + safe + " (" + where + ")";
                runOnUiThread(new Runnable() {
                    public void run() { Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show(); }
                });
            } catch (Exception e) {
                runOnUiThread(new Runnable() {
                    public void run() { Toast.makeText(MainActivity.this, "저장하지 못했어요", Toast.LENGTH_LONG).show(); }
                });
            }
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_FILE && filePathCb != null) {
            filePathCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            filePathCb = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] results) {
        if (req == REQ_MIC && pendingPerm != null) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
                pendingPerm.grant(new String[]{ PermissionRequest.RESOURCE_AUDIO_CAPTURE });
            } else {
                pendingPerm.deny();
                Toast.makeText(this, "마이크를 허용해야 튜너·노래 만들기를 쓸 수 있어요", Toast.LENGTH_LONG).show();
            }
            pendingPerm = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean f) {
        super.onWindowFocusChanged(f);
        if (f) immersive();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
