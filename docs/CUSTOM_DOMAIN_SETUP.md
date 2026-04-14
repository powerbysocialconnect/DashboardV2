# Custom Domain Setup Guide

This guide outlines the process for connecting a custom domain to a store on the PixeoCommerce platform. As part of our service, **every plan includes a free custom domain for the first year.**

---

## 1. Client (Merchant) Responsibilities

To initiate the custom domain setup, the client should follow these steps:

### Step 1: Choose and Request a Domain
Connect with the PixeoCommerce support team or an administrator to choose your free domain name (e.g., `www.yourbrand.com`). If you already own a domain, provide the name to the admin.

### Step 2: Configure DNS Records
If you are using a domain you registered externally, you must point your DNS records to our platform. Log in to your domain provider (e.g., GoDaddy, Namecheap) and add the following records:

| Type | Host | Value | Note |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | Points your root domain to our servers (Vercel) |
| **CNAME** | `www` | `cname.vercel-dns.com` | (Optional) Recommended for `www` subdomains |

### Step 3: Notify the Admin
Once you have updated your DNS records, notify the PixeoCommerce administrator so they can finalize the connection on the platform.

---

## 2. Administrator Responsibilities

Administrators are the only users who can add and verify custom domains in the database.

### Step 1: Access the Store Management
1. Log in to the **Admin Dashboard**.
2. Navigate to the **Stores** list.
3. Click on the store that requested the domain to view its details (`/admin/stores/[id]`).

### Step 2: Add the Custom Domain
1. In the **Overview** tab, find the **Custom Domains** card.
2. Enter the domain name (e.g., `yourbrand.com`) in the "Add Custom Domain" field.
3. Click **Add Domain**.
   - *Note: Domains added via the Admin Panel are automatically marked as verified in our resolution logic.*

### Step 3: Set as Primary (Optional)
If the client wants this custom domain to be their main URL (automatically redirecting users from their `*.pixeocommerce.com` subdomain):
1. Locate the domain in the list.
2. Toggle the **Primary** switch to **ON**.

### Step 4: Vercel Project Configuration
Ensure the domain is added to the Vercel project settings to enable SSL termination:
1. Go to the **Vercel Dashboard** for the project.
2. Navigate to **Settings > Domains**.
3. Add the domain (`yourbrand.com`) and its `www` variant if necessary.

---

## Technical Overview

- **Redirection**: When a domain is set as "Primary," the middleware automatically redirects any traffic from the PixeoCommerce subdomain (e.g., `mystore.pixeocommerce.com`) to the custom domain.
- **SSL**: SSL certificates are automatically provisioned via Vercel once the DNS records are correctly pointed and the domain is added to the Vercel dashboard.
- **Persistence**: Domain settings are stored in the `store_domains` table and prioritized by the `getStoreByHostname` utility.
