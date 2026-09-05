# Razorpay MCP Server (Official Documentation & Integration Guide)

The **Razorpay MCP Server** is an official [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server that provides seamless integration with Razorpay APIs, enabling advanced payment processing, transaction audits, and workflow automation for developers and AI agents in the Writopedia AI platform.

---

## 1. Quick Start

Choose your preferred setup method:
- **[Remote MCP Server (Recommended)](#2-remote-mcp-server-recommended)**: Hosted by Razorpay (`https://mcp.razorpay.com/mcp`), zero infrastructure required.
- **[Local MCP Server](#5-local-mcp-server-deployment)**: Run on your own infrastructure via Docker or Go source binary.

---

## 2. Remote MCP Server (Recommended)

The Remote MCP Server is hosted directly by Razorpay and provides instant access to Razorpay APIs without local Docker or Go requirements.

### Key Benefits
- **Zero Setup**: No local container management or runtime dependencies.
- **Always Updated**: Automatically patched with the latest Razorpay API schemas.
- **High Availability**: Enterprise 99.9% uptime backed by Razorpay infrastructure.
- **Reduced Latency**: Edge routing and caching for high-speed API responses.
- **Secure Token Auth**: Base64 merchant token authentication with rotation support.

### Prerequisites
Requires `npx` (included with Node.js):
- **macOS**: `brew install node`
- **Windows**: `choco install nodejs` (or official installer from [nodejs.org](https://nodejs.org/))

Verify installation:
```bash
npx --version
```

---

## 3. Available Tools Reference

The Razorpay MCP server exposes the following tools:

| Tool | Description | Official API Reference | Remote Server Support |
| :--- | :--- | :--- | :---: |
| `capture_payment` | Change payment status from `authorized` to `captured` | [Capture API](https://razorpay.com/docs/api/payments/capture) | ✅ |
| `fetch_payment` | Fetch complete payment details with ID (`pay_xxx`) | [Fetch Payment](https://razorpay.com/docs/api/payments/fetch-with-id) | ✅ |
| `fetch_payment_card_details` | Fetch tokenized card issuer, network, and last4 info | [Expanded Card](https://razorpay.com/docs/api/payments/fetch-payment-expanded-card) | ✅ |
| `fetch_all_payments` | Fetch all payments with filtering and pagination | [All Payments](https://razorpay.com/docs/api/payments/fetch-all-payments) | ✅ |
| `update_payment` | Update the notes field of an existing payment | [Update Payment](https://razorpay.com/docs/api/payments/update) | ✅ |
| `initiate_payment` | Initiate payment using customer token or saved card | [Create Payment](https://github.com/razorpay/razorpay-go/blob/master/documents/payment.md#create-payment-json) | ✅ |
| `resend_otp` | Resend 2FA OTP for pending authentication | [OTP Resend](https://github.com/razorpay/razorpay-go/blob/master/documents/payment.md#otp-resend) | ✅ |
| `submit_otp` | Verify and submit OTP to complete payment | [OTP Submit](https://github.com/razorpay/razorpay-go/blob/master/documents/payment.md#otp-submit) | ✅ |
| `create_payment_link` | Creates standard payment link with auto-notify | [Create Standard](https://razorpay.com/docs/api/payments/payment-links/create-standard) | ✅ |
| `create_payment_link_upi` | Creates a mobile UPI deep-link payment URL | [Create UPI Link](https://razorpay.com/docs/api/payments/payment-links/create-upi) | ✅ |
| `fetch_all_payment_links` | Fetch all active and expired payment links | [Fetch All Links](https://razorpay.com/docs/api/payments/payment-links/fetch-all-standard) | ✅ |
| `fetch_payment_link` | Fetch details of a payment link with ID | [Fetch Link](https://razorpay.com/docs/api/payments/payment-links/fetch-id-standard/) | ✅ |
| `send_payment_link` | Resend payment link notification via SMS or email | [Resend Link](https://razorpay.com/docs/api/payments/payment-links/resend) | ✅ |
| `update_payment_link` | Updates parameters of a standard payment link | [Update Link](https://razorpay.com/docs/api/payments/payment-links/update-standard) | ✅ |
| `create_order` | Creates an order with amount, currency, and notes | [Create Order](https://razorpay.com/docs/api/orders/create/) | ✅ |
| `fetch_order` | Fetch order details with Order ID (`order_xxx`) | [Fetch Order](https://razorpay.com/docs/api/orders/fetch-with-id) | ✅ |
| `fetch_all_orders` | Fetch orders with date range and pagination | [Fetch All Orders](https://razorpay.com/docs/api/orders/fetch-all) | ✅ |
| `update_order` | Update notes and receipt on an existing order | [Update Order](https://razorpay.com/docs/api/orders/update) | ✅ |
| `fetch_order_payments` | Fetch all payment attempts tied to an Order ID | [Order Payments](https://razorpay.com/docs/api/orders/fetch-payments/) | ✅ |
| `create_refund` | Creates an instant or standard refund | [Create Refund](https://razorpay.com/docs/api/refunds/create-instant/) | ❌ *(Local Only)* |
| `fetch_refund` | Fetch refund status and reversal details by ID | [Fetch Refund](https://razorpay.com/docs/api/refunds/fetch-with-id/) | ✅ |
| `fetch_all_refunds` | List all historical merchant refunds | [All Refunds](https://razorpay.com/docs/api/refunds/fetch-all) | ✅ |
| `update_refund` | Update refund notes with ID | [Update Refund](https://razorpay.com/docs/api/refunds/update/) | ✅ |
| `fetch_multiple_refunds_for_payment` | Fetch all refunds for a specific payment ID | [Payment Refunds](https://razorpay.com/docs/api/refunds/fetch-multiple-refund-payment/) | ✅ |
| `fetch_specific_refund_for_payment` | Fetch a specific refund tied to a payment ID | [Specific Refund](https://razorpay.com/docs/api/refunds/fetch-specific-refund-payment/) | ✅ |
| `create_qr_code` | Creates dynamic or static UPI QR Code | [Create QR](https://razorpay.com/docs/api/qr-codes/create/) | ✅ |
| `fetch_qr_code` | Fetch QR Code status and SVG/PNG string with ID | [Fetch QR](https://razorpay.com/docs/api/qr-codes/fetch-with-id/) | ✅ |
| `fetch_all_qr_codes` | List all generated QR Codes across the account | [All QR Codes](https://razorpay.com/docs/api/qr-codes/fetch-all/) | ✅ |
| `fetch_qr_codes_by_customer_id` | Fetch QR Codes attached to a customer ID | [Customer QR](https://razorpay.com/docs/api/qr-codes/fetch-customer-id/) | ✅ |
| `fetch_qr_codes_by_payment_id` | Find QR Code that originated a payment | [Payment QR](https://razorpay.com/docs/api/qr-codes/fetch-payment-id/) | ✅ |
| `fetch_payments_for_qr_code` | Fetch payments collected via a QR Code | [QR Payments](https://razorpay.com/docs/api/qr-codes/fetch-payments/) | ✅ |
| `close_qr_code` | Deactivate/close an active QR Code | [Close QR](https://razorpay.com/docs/api/qr-codes/close/) | ❌ *(Local Only)* |
| `fetch_all_settlements` | Fetch historical bank settlement records | [Settlements](https://razorpay.com/docs/api/settlements/fetch-all) | ✅ |
| `fetch_settlement_with_id` | Fetch settlement breakdown and fee deductions | [Settlement Details](https://razorpay.com/docs/api/settlements/fetch-with-id) | ✅ |
| `fetch_settlement_recon_details` | Fetch reconciliation report for bank sync | [Settlement Recon](https://razorpay.com/docs/api/settlements/fetch-recon) | ✅ |
| `create_instant_settlement` | Request on-demand instant bank settlement | [Instant Settlement](https://razorpay.com/docs/api/settlements/instant/create) | ❌ *(Local Only)* |
| `fetch_all_instant_settlements` | Query all instant settlement requests | [All Instant Settlements](https://razorpay.com/docs/api/settlements/instant/fetch-all) | ✅ |
| `fetch_instant_settlement_with_id` | Query specific instant settlement status | [Instant Settlement ID](https://razorpay.com/docs/api/settlements/instant/fetch-with-id) | ✅ |
| `fetch_all_payouts` | List outgoing payouts with bank account number | [Payouts API](https://razorpay.com/docs/api/x/payouts/fetch-all/) | ✅ |
| `fetch_payout_by_id` | Fetch payout details with payout ID | [Payout with ID](https://razorpay.com/docs/api/x/payouts/fetch-with-id) | ✅ |
| `fetch_tokens` | Retrieve saved cards/tokens for a customer | [Token API](https://razorpay.com/docs/payments/payment-gateway/s2s-integration/recurring-payments/cards/tokens/) | ✅ |
| `revoke_token` | Revoke a saved customer payment token | [Revoke Token](https://razorpay.com/docs/payments/payment-gateway/s2s-integration/recurring-payments/upi-otm/collect/tokens/#24-cancel-token) | ✅ |
| `create_registration_link` | Create registration link for recurring auth | [Registration Link](https://razorpay.com/docs/api/payments/recurring-payments/registration-link/) | ❌ *(Local Only)* |
| `detect_stack` | Detect project tech stack for integration | MCP Helper | ✅ |
| `integrate_razorpay_checkout` | Generate standard checkout integration templates | MCP Helper | ✅ |

---

## 4. Authentication & Client Configurations

### Generating the Merchant Token
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/) > **Settings > API Keys**.
2. Locate your **API Key ID** (`rzp_test_...` or `rzp_live_...`) and **API Key Secret**.
3. Run the encoding command:
   ```bash
   echo -n "<RAZORPAY_API_KEY>:<RAZORPAY_API_SECRET>" | base64
   ```
4. Copy the resulting base64 string.

### IDE Configurations

#### 1. Antigravity IDE (`mcp_config.json`)
```json
{
  "mcpServers": {
    "razorpay": {
      "serverUrl": "https://mcp.razorpay.com/mcp",
      "headers": {
        "Authorization": "Basic <MERCHANT_TOKEN>"
      }
    }
  }
}
```

#### 2. Cursor Settings (MCP)
```json
{
  "mcpServers": {
    "rzp-mcp-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.razorpay.com/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Basic <Base64(key:secret)>"
      }
    }
  }
}
```

#### 3. Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "rzp-mcp-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.razorpay.com/mcp",
        "--header",
        "Authorization: Basic <Merchant Token>"
      ]
    }
  }
}
```

#### 4. VS Code (`settings.json`)
```json
{
  "mcp": {
    "inputs": [
      {
        "type": "promptString",
        "id": "merchant_token",
        "description": "Razorpay Merchant Token",
        "password": true
      }
    ],
    "servers": {
      "razorpay-remote": {
        "command": "npx",
        "args": [
          "mcp-remote",
          "https://mcp.razorpay.com/mcp",
          "--header",
          "Authorization: Basic ${input:merchant_token}"
        ]
      }
    }
  }
}
```

---

## 5. Local MCP Server Deployment

For self-hosted workflows or when tools restricted on the remote server (`create_refund`, `close_qr_code`, `create_instant_settlement`, `create_registration_link`) are needed:

### Using Public Docker Image
```bash
docker run --rm -i -e RAZORPAY_KEY_ID="rzp_test_xxx" -e RAZORPAY_KEY_SECRET="your_secret" razorpay/mcp
```

### Build from Docker
```bash
git clone https://github.com/razorpay/razorpay-mcp-server.git
cd razorpay-mcp-server
docker build -t razorpay-mcp-server:latest .
```

### Build from Go Source
```bash
git clone https://github.com/razorpay/razorpay-mcp-server.git
cd razorpay-mcp-server
go build -o razorpay-mcp-server ./cmd/razorpay-mcp-server
```

---

## 6. Server Configuration & CLI Flags

| Variable / Flag | Description | Default |
| :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` / `-k` | Razorpay Key ID | Required |
| `RAZORPAY_KEY_SECRET` / `-s` | Razorpay Key Secret | Required |
| `LOG_FILE` / `-l` | Path to log file | `./logs` |
| `TOOLSETS` / `-t` | Comma-separated enabled toolsets | `"all"` |
| `READ_ONLY` / `--read-only` | Run server in read-only mode | `false` |

---

## 7. Writopedia AI Platform Guardrails

- **Zero Price Tampering**: AI tools and developers must never change commercial plan pricing or credit ratios via MCP calls.
- **Audit Verification**: Use `fetch_order` and `fetch_payment` to inspect live state during automated payment testing.
- **Test Mode Mandatory**: In development and CI environments, keys must strictly be Razorpay Test credentials (`rzp_test_...`).
