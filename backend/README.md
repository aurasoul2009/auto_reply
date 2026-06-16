# Rhythm Skin Care Automation

Server-rendered WhatsApp and Instagram automation backend for Rhythm Skin Care,
a skincare products and skin consultation business. It uses official Meta APIs
only: no WhatsApp Web, browser automation, scraping, or unofficial bots.

Tagline: **Glow Naturally. Care Deeply.**

Editable business content lives in `src/config/brand.js`, including the brand
name, tagline, support placeholders, theme palette, default WhatsApp welcome
message, product list, and approved-template suggestions.

## What It Does

- WhatsApp and Instagram auto-replies for `hi`, `hello`, and `start`
- Four-option Rhythm Skin Care menu
- Product enquiry flow for Face Wash, Moisturizer, Sunscreen, Face Serum,
  Night Cream, and Lip Balm
- Skin consultation intake that stores name, age, skin type, concern, and phone
- Excel customer upload with Indian phone normalization
- Approved-template-only bulk WhatsApp campaigns
- STOP unsubscribe handling
- Session-protected admin dashboard
- Message logs, campaign results, product list, templates, and analytics

## Local Setup

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Open [http://localhost:5000/admin](http://localhost:5000/admin).

Minimum values needed in `.env`:

```dotenv
MONGO_URI=
META_VERIFY_TOKEN=
ADMIN_USERNAME=admin
ADMIN_PASSWORD=use-a-strong-password
SESSION_SECRET=use-a-long-random-secret
```

WhatsApp sending also requires:

```dotenv
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_API_VERSION=v25.0
```

`WHATSAPP_PHONE_NUMBER_ID` must be the numeric Phone Number ID from Meta, not
the visible phone number and not the text `PHONE_NUMBER_ID`.

Instagram DM auto-replies use the Instagram API with Instagram Login. They
require an Instagram user access token with messaging permission and the
Instagram professional account ID:

```dotenv
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
INSTAGRAM_API_VERSION=v25.0
```

This integration does not use `INSTAGRAM_PAGE_ID`, Facebook Page access tokens,
or `/me/accounts` lookup.

## Admin Modules

- **Customers**: upload Excel contacts and view recent customers
- **Campaigns**: view previous bulk campaigns and results
- **Bulk Messages**: send approved WhatsApp templates to eligible customers
- **Consultations**: view saved skincare consultation requests
- **Products**: view Rhythm product catalog used in replies
- **Templates**: see recommended approved WhatsApp template names
- **Analytics**: customer, message, consultation, and enquiry counts
- **Settings**: update the Rhythm menu and reply copy

## WhatsApp Auto Reply Flow

When a customer sends `Hi`, Rhythm replies:

```text
Hi 💗 Welcome to Rhythm Skin Care!

Thank you for reaching out.

How can we help you today?

1. Products
2. Offers
3. Skin Care Guidance
4. Talk to Support
```

Customers can reply with `1`, `2`, `3`, `4`, or the option label.

WhatsApp Cloud API reply buttons support only three buttons, so the four-option
Rhythm menu is sent as a text menu on WhatsApp. Instagram can still use quick
replies.

Consultation flow collects and stores:

- Name
- Age
- Skin type
- Skin concern
- Phone number

## Bulk WhatsApp Templates

Bulk campaigns are template-only and send only to customers with:

- `subscribed=true`
- `optIn=true`
- a valid phone number

Recommended Rhythm template names:

- `product_launch`
- `festival_offer`
- `skin_consultation_reminder`
- `follow_up_message`
- `discount_campaign`

Create and approve these templates in Meta before production sending.

## Admin Campaign Steps

1. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SESSION_SECRET`.
2. Run `npm run dev`.
3. Open [http://localhost:5000/admin](http://localhost:5000/admin).
4. Upload `contacts.xlsx` with columns `name` and `phone`.
5. Open **Bulk Messages**.
6. Select an approved template, such as `product_launch` or `festival_offer`.
7. Add optional body variables for `{{1}}`, `{{2}}`, and `{{3}}`.
8. Preview eligible customer count.
9. Send campaign.
10. Check **Campaigns** and **Message Logs**.

For Meta test-number testing, you can still use `hello_world`.

## Existing API Routes

Existing API routes are preserved:

```http
GET /health
GET /webhook/meta
POST /webhook/meta
GET /api/config
PUT /api/config
GET /api/contacts
POST /api/contacts/add
POST /api/contacts/upload
PATCH /api/contacts/:id/unsubscribe
GET /api/messages
GET /api/campaigns
POST /api/campaigns/send
POST /api/campaigns/send-test
GET /api/test/config
POST /api/test/whatsapp-template
POST /api/test/whatsapp-text
POST /api/test/whatsapp-buttons
```

In production, `/api/*` routes require `x-api-key: ADMIN_API_KEY`. The admin
panel uses session login and does not expose Meta access tokens.

## WhatsApp Cloud API Notes

- First outbound messages must use approved templates.
- Normal text and menu replies work after the customer messages the business
  within the 24-hour customer service window.
- The webhook endpoint is `/webhook/meta`.
- Default support placeholders are `+91XXXXXXXXXX` and
  `support@rhythmskincare.example`; update them in `src/config/brand.js`.
- Use the official Cloud API endpoint:

```text
https://graph.facebook.com/v25.0/{WHATSAPP_PHONE_NUMBER_ID}/messages
```

## Instagram Login API Notes

- Instagram message sending uses:

```text
https://graph.instagram.com/v25.0/{INSTAGRAM_BUSINESS_ACCOUNT_ID}/messages
```

- Webhook callback remains `https://YOUR_HOST/webhook/meta`.
- Configure Instagram webhook subscriptions for message events in Meta.
- Incoming webhook events are stored in the existing message log schema using
  the Instagram-scoped sender ID.
- Quick replies use the same auto-reply menu labels and payloads as the current
  automation flow.

## Render Deployment

The repository includes `render.yaml`.

1. Create a Render web service or Blueprint.
2. Root directory: `backend`
3. Build command: `npm ci`
4. Start command: `npm start`
5. Add MongoDB Atlas and Meta credentials as Render secrets.
6. Add a strong admin username/password and session secret.
7. Set Meta webhook callback to `https://YOUR_HOST/webhook/meta`.

## Legal Notes

- Send campaigns only to customers with clear opt-in consent.
- Use approved WhatsApp templates for bulk/business-initiated campaigns.
- Honor STOP unsubscribe immediately.
- The business is responsible for Meta WhatsApp charges and policy compliance.
- Access to a phone number is not the same as marketing consent.
