package io.bimurto.drivingtheory

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import kotlin.math.roundToInt

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var webContainer: FrameLayout
    private lateinit var offlineView: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        configureWebView()
        configureWebContainer()
        showWebView()
        if (savedInstanceState == null) webView.loadUrl(HOME_URL) else webView.restoreState(savedInstanceState)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView = WebView(this).apply {
            setBackgroundColor(Color.WHITE)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webViewClient = RoadReadyWebViewClient()
        }
        offlineView = createOfflineView()
    }

    private fun configureWebContainer() {
        webContainer = FrameLayout(this).apply {
            setBackgroundColor(Color.WHITE)
            addView(webView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        }
        ViewCompat.setOnApplyWindowInsetsListener(webContainer) { _, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val layout = webView.layoutParams as FrameLayout.LayoutParams
            layout.setMargins(systemBars.left, systemBars.top + dp(8), systemBars.right, systemBars.bottom)
            webView.layoutParams = layout
            insets
        }
    }

    private fun showWebView() {
        setContentView(webContainer)
        ViewCompat.requestApplyInsets(webContainer)
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).roundToInt()

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
                showWebView()
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
