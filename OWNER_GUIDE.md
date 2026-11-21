# Owner's guide — AH Enterprise catalog

You run the whole catalog from **one Google Sheet**. You never need to touch
code or "redeploy" anything. Change the sheet, wait a few minutes, refresh.

The sheet has three tabs:

- **Products**: one row per product
- **Categories**: Kurtis, Abayas, Sarees and so on
- **Settings**: your shop name, WhatsApp number, announcement and notes

---

## 1. Adding a new product

### Step 1: put the photos in Google Drive

1. Open Google Drive on your phone or computer.
2. Make a folder called **Catalog photos** (only once).
3. Share the folder: tap ⋮ (or right-click) → **Share** → under *General access*
   choose **Anyone with the link** and **Viewer** → **Done**.
   Every photo you put in this folder can now be seen on the site.
   **This is the most important step.** If you skip it, customers see a blank box.
4. Upload the product photos into the folder.

Tips: take photos in daylight, hold the phone **upright (portrait)**, and keep
the dress in the middle. The site shows photos in an upright 3:4 frame.

### Step 2: copy each photo's link

1. Open the photo in Drive → ⋮ → **Share** → **Copy link**.
2. The link looks like
   `https://drive.google.com/file/d/1AbC...xyz/view?usp=sharing`.
   Paste it exactly as it is. The site converts it automatically.

### Step 3: add a row in the Products tab

Add the new product on the **next empty row at the bottom**.

| column | what to type | example |
|---|---|---|
| id | a code nobody else uses | `AH-1008` |
| active | `Yes` to show it | `Yes` |
| featured | `Yes` to pin it to "New & Featured" | `No` |
| name | the product name | `Cotton Printed Kurti` |
| category | the **slug** from the Categories tab | `kurtis` |
| price | MRP, numbers only | `999` |
| offer_price | sale price, or leave empty | `849` |
| sizes | separated by commas | `S,M,L,XL` or `Free Size` |
| out_of_stock_sizes | sizes you don't have right now | `XL` |
| colours | separated by commas | `Maroon,Navy` |
| fabric | optional | `Cotton` |
| description | optional, can be several lines | |
| images | photo links separated by commas. **The first is the cover photo** | `https://drive.google.com/file/d/.../view, https://drive.google.com/file/d/.../view` |
| tags | optional extra search words | `office,daily wear` |
| sort_order | optional; smaller numbers show first | `10` |

A product appears only if it has an **id, name, price and at least one
photo**, and `active` is **Yes**.

---

## 2. Everyday changes

| I want to… | Do this |
|---|---|
| **Hide** a product | Change `active` to `No`. Don't delete the row; you can bring it back later. |
| Mark **some sizes out of stock** | Write them in `out_of_stock_sizes`, e.g. `XL,XXL`. They show crossed out and can't be chosen. |
| Mark the **whole product out of stock** | Put **all** its sizes in `out_of_stock_sizes`. It gets an "Out of stock" ribbon and moves to the end. |
| Put an item **on offer** | Type the sale price in `offer_price` (lower than `price`). The site shows the old price crossed out and "% off". Clear it to end the offer. |
| **Feature** an item | Set `featured` to `Yes`. It appears in "New & Featured" at the top. |
| Change a **price** | Edit `price` or `offer_price`. |
| Change the **order** of products | Use `sort_order`: 1 shows first, then 2, and so on. Empty = after the numbered ones. |
| Add a **new category** | Add a row in **Categories**: `slug` (short, lowercase, no spaces, e.g. `party-wear`), `name` (`Party Wear`), a photo link in `image`, `sort_order`, and `active` = Yes. Then use that slug in each product's `category`. A category with no products is hidden. |
| Change the **announcement bar** | Settings tab → `announcement_bar`. Leave it empty to hide the bar. |
| Change the **WhatsApp number** | Settings tab → `whatsapp_number`: country code + number, digits only, e.g. `919876543210`. |

---

## 3. How long changes take

About **1 to 5 minutes**. Google takes a minute or two to update its
published copy, and the site keeps its own copy for 60 seconds so it stays fast.

In a hurry? Open **your-site/api/health?fresh=1** once. It re-reads the
sheet straight away.

---

## 4. Checking for mistakes: /api/health

Open **your-site/api/health** in your browser.

- `"ok": true` with an empty `warnings` list means everything is fine.
- Otherwise each warning gives the **tab, row number and problem**, e.g.

  `Products row 14: missing image — product not shown`
  `Products row 9: AH-1003: offer_price must be lower than price (ignored)`
  `Settings: whatsapp_number "91XXXXXXXXXX" is not a full number`

Fix that row in the sheet and check again after a minute or two.

---

## 5. Tracked links for ads and posters

Add `?src=` and a name to the end of your link. When a customer orders, the
WhatsApp message ends with **Ref: that name**, so you know what brought them.

| Where | Link to use |
|---|---|
| Facebook ad | `https://your-site/?src=fb-ad` |
| Instagram ad | `https://your-site/?src=insta-ad` |
| Poster at the shop | `https://your-site/?src=poster-1` |
| Kurti ad, straight to kurtis | `https://your-site/?cat=kurtis&src=fb-kurti` |
| One product | `https://your-site/p/rayon-printed-kurti-ah-1001?src=story` |

For posters, turn the link into a QR code with any free QR code maker.

### Send the catalog link automatically on WhatsApp Business

WhatsApp Business app → **Settings → Business tools → Greeting message** →
turn it on and write, for example:

> Assalamu Alaikum, welcome to AH Enterprise! 👋
> See our full collection here: https://your-site/?src=wa-greeting
> Tap "Order on WhatsApp" on any item and we'll reply right away.

You can also save it as a **Quick reply** (Business tools → Quick replies),
e.g. `/catalog`, to send it in any chat.

---

## 6. Troubleshooting

**A photo shows a grey box with letters instead of the picture**
- The photo isn't shared. In Drive, share the photo (or its folder) as
  **Anyone with the link – Viewer**.
- You pasted a **folder** link. Use the link of the single photo.
- The link got cut off. Copy it again.

**A product doesn't appear**
- Is `active` exactly `Yes`?
- Does it have an id, name, price and at least one photo link?
- Is its id the same as another row's? Each id must be unique.
- Open `/api/health`. It tells you the row and the reason.
- Still nothing after 5 minutes? Open `/api/health?fresh=1`.

**A product shows under "All" but not in its category**
- `category` must match a `slug` in the Categories tab exactly (`kurtis`, not `Kurti`).

**The price is wrong, or no "% off" shows**
- Type numbers only (`1299`, not `Rs 1299/-`). ₹ and commas are fine.
- `offer_price` must be **lower** than `price`, otherwise it is ignored.

**The whole site says "Couldn't load the catalog"**
- The sheet may have been un-published. **File → Share → Publish to web** and
  check all three tabs are still published.
- Don't rename the tabs or change the column headings in row 1.

**The order button opens WhatsApp but asks which chat to send to**
- `whatsapp_number` is missing or wrong in Settings.

**Never** delete or rename the column headings in row 1, and don't insert
empty columns in the middle. Everything else is safe to edit.
