terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {}
variable "zone_id" {}

variable "icp_frontend_canister_id" {
  description = "Mainnet asset canister ID for _canister-id TXT records (IC custom domain)"
  type        = string
}

# =========================================================
# Domain: univoices.club
# ICP frontend canister (see icp_frontend_canister_id in terraform.tfvars):
#
# IMPORTANT:
# ICP custom domains must be DNS only, not Cloudflare proxied.
# =========================================================

# =========================
# 1. ICP Frontend: Root domain
# https://univoices.club
# =========================

resource "cloudflare_record" "root_icp" {
  zone_id = var.zone_id
  name    = "@"
  type    = "CNAME"

  # ICP custom domain rule:
  # CUSTOM_DOMAIN -> CUSTOM_DOMAIN.icp1.io
  value = "univoices.club.icp1.io"

  # MUST be false for ICP custom domains
  proxied = false
  ttl     = 3600
}

resource "cloudflare_record" "root_canister_id" {
  zone_id = var.zone_id
  name    = "_canister-id"
  type    = "TXT"
  value   = var.icp_frontend_canister_id
  proxied = false
  ttl     = 3600
}

resource "cloudflare_record" "root_acme" {
  zone_id = var.zone_id
  name    = "_acme-challenge"
  type    = "CNAME"
  value   = "_acme-challenge.univoices.club.icp2.io"
  proxied = false
  ttl     = 3600
}

# =========================
# 2. ICP Frontend: www
# https://www.univoices.club
#
# Recommended:
# Treat www as a separate ICP custom domain.
# Your asset canister should include both:
# univoices.club
# www.univoices.club
# inside .well-known/ic-domains
# =========================

resource "cloudflare_record" "www_icp" {
  zone_id = var.zone_id
  name    = "www"
  type    = "CNAME"
  value   = "www.univoices.club.icp1.io"
  proxied = false
  ttl     = 3600
}

resource "cloudflare_record" "www_canister_id" {
  zone_id = var.zone_id
  name    = "_canister-id.www"
  type    = "TXT"
  value   = var.icp_frontend_canister_id
  proxied = false
  ttl     = 3600
}

resource "cloudflare_record" "www_acme" {
  zone_id = var.zone_id
  name    = "_acme-challenge.www"
  type    = "CNAME"
  value   = "_acme-challenge.www.univoices.club.icp2.io"
  proxied = false
  ttl     = 3600
}

# =========================================================
# 3. Aliyun AIO services
#
# https://mcp.univoices.club
# https://webchat.univoices.club
#
# Origin server:
# 8.141.81.75
#
# These CAN use Cloudflare proxy.
# Browser HTTPS certificate is provided by Cloudflare.
# For best security, install Cloudflare Origin Certificate
# on your Aliyun Nginx and use SSL mode: Full (Strict).
# =========================================================

resource "cloudflare_record" "mcp_aliyun" {
  zone_id = var.zone_id
  name    = "mcp"
  type    = "A"
  value   = "8.141.81.75"

  # Cloudflare proxy ON
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "webchat_aliyun" {
  zone_id = var.zone_id
  name    = "webchat"
  type    = "A"
  value   = "8.141.81.75"

  # Cloudflare proxy ON
  proxied = true
  ttl     = 1
}

# =========================================================
# 4. Phantom wallet verification
#
# Replace value if Phantom gives you a new challenge
# for univoices.club.
# =========================================================

resource "cloudflare_record" "phantom_challenge" {
  zone_id = var.zone_id
  name    = "_phantom_portal-challenge"
  type    = "TXT"
  value   = "66e6c05782536189e7e1c4ec2f924d0c899ee14b2fc0058e2302d1376ce8bdd3"
  proxied = false
  ttl     = 3600
}

# =========================================================
# 5. Optional mail records
#
# Only keep these if you still use GoDaddy / secureserver email.
# Otherwise you can remove them.
# =========================================================

resource "cloudflare_record" "spf" {
  zone_id = var.zone_id
  name    = "@"
  type    = "TXT"
  value   = "v=spf1 include:secureserver.net -all"
  proxied = false
  ttl     = 3600
}

resource "cloudflare_record" "dmarc" {
  zone_id = var.zone_id
  name    = "_dmarc"
  type    = "TXT"
  value   = "v=DMARC1; p=reject; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;"
  proxied = false
  ttl     = 3600
}

resource "cloudflare_record" "email" {
  zone_id = var.zone_id
  name    = "email"
  type    = "CNAME"
  value   = "email.secureserver.net"
  proxied = false
  ttl     = 3600
}

# =========================================================
# 6. Cache bypass for proxied API services
# =========================================================

resource "cloudflare_ruleset" "cache_bypass_api" {
  zone_id = var.zone_id
  name    = "Bypass Cache for API Services"
  kind    = "zone"
  phase   = "http_request_cache_settings"

  rules {
    action = "set_cache_settings"

    action_parameters {
      cache = false
    }

    expression  = "(http.host in {\"mcp.univoices.club\" \"webchat.univoices.club\"})"
    description = "Bypass cache for AIO backend services"
    enabled     = true
  }
}

# =========================================================
# 7. FUTURE AWS IM services
#
# Uncomment after AWS ALB / ECS is ready.
#
# uchat.univoices.club -> Univoice IM chat-api
# usse.univoices.club  -> Univoice IM SSE service
#
# Suggested:
# - Proxy ON
# - Cloudflare SSL: Full or Full Strict
# - Cache bypass
# - WebSocket/SSE compatible Nginx/ALB config
# =========================================================

# resource "cloudflare_record" "uchat_aws" {
#   zone_id = var.zone_id
#   name    = "uchat"
#   type    = "CNAME"
#   value   = "YOUR_AWS_ALB_DNS_NAME"
#   proxied = true
#   ttl     = 1
# }

# resource "cloudflare_record" "usse_aws" {
#   zone_id = var.zone_id
#   name    = "usse"
#   type    = "CNAME"
#   value   = "YOUR_AWS_ALB_DNS_NAME"
#   proxied = true
#   ttl     = 1
# }

# Future cache bypass rule extension:
# change expression to:
# (http.host in {"mcp.univoices.club" "webchat.univoices.club" "uchat.univoices.club" "usse.univoices.club"})
