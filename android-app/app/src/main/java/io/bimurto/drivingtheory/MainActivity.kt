package io.bimurto.drivingtheory

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var offlineView: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        configureWebView()
        setContentView(webView)
        if (savedInstanceState == null) webView.loadUrl(HOME_URL) else webView.restoreState(savedInstanceState)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView = WebView(this).apply {
            setBackgroundColor(Color.WHITE)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                setOnApplyWindowInsetsListener { view, insets ->
                    val systemBars = insets.getInsets(WindowInsets.Type.systemBars())
                    view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
                    insets
                }
            }
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webViewClient = RoadReadyWebViewClient()
        }
        offlineView = createOfflineView()
    }

    private fun createOfflineView(): View = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = android.view.Gravity.CENTER
        setPadding(48, 48, 48, 48)
        addView(TextView(context).apply {
            text = getString(R.string.offline_message)
            textSize = 18f
            gravity = android.view.Gravity.CENTER
        })
        addView(Button(context).apply {
            text = getString(R.string.retry)
            setOnClickListener {
                setContentView(webView)
                webView.loadUrl(HOME_URL)
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    private inner class RoadReadyWebViewClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url
            if (url.scheme == "https" && url.host == APP_HOST && isAppPath(url.path)) return false
            startActivity(Intent(Intent.ACTION_VIEW, url))
            return true
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (request.isForMainFrame) setContentView(offlineView)
        }
    }

    private companion object {
        const val APP_HOST = "bimurto.github.io"
        const val APP_PATH = "/driving-theory"
        const val HOME_URL = "https://bimurto.github.io/driving-theory/"

        fun isAppPath(path: String?): Boolean = path == APP_PATH || path?.startsWith("$APP_PATH/") == true
    }
}
