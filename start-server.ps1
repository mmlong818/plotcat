$proxyUri = [System.Net.WebRequest]::GetSystemWebProxy().GetProxy("https://generativelanguage.googleapis.com/")

if ($proxyUri -and $proxyUri.AbsoluteUri -and $proxyUri.AbsoluteUri -notmatch "^https://generativelanguage.googleapis.com/?$") {
  $env:HTTP_PROXY = $proxyUri.AbsoluteUri
  $env:HTTPS_PROXY = $proxyUri.AbsoluteUri
}

node --use-env-proxy server.js
