package com.raphaelkalfon.minyannow;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

/** Android shell: disable WebView zoom so the app fills the screen like a native app. */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        lockWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        lockWebView();
    }

    private void lockWebView() {
        try {
            if (this.bridge == null) return;
            WebView webView = this.bridge.getWebView();
            if (webView == null) return;
            WebSettings settings = webView.getSettings();
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            webView.setHorizontalScrollBarEnabled(false);
            webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        } catch (Exception ignored) {
            /* bridge not ready yet */
        }
    }
}
