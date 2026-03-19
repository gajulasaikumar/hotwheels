# Hot Wheels Garage Storefront

This is a user-friendly, multi-navigation Hot Wheels storefront for selling online.

## Files

- `index.html` - multi-navigation storefront (Home, Collection, New Arrivals, Brands, FAQ, Contact)
- `product.html` - dedicated product detail page
- `styles.css` - clean responsive UI
- `script.js` - filters, load-more pagination, stock-safe cart, WhatsApp checkout
- `product.js` - product detail view and add-to-cart from detail page
- `products.json` - your inventory source (best for 1000+ products)
- `inventory.xlsx` - preferred inventory source (if present, site reads this first)

## Customize for your store

1. Update your WhatsApp number in `script.js`:
   - `const STORE_WHATSAPP_NUMBER = "919999999999";`
2. Set your shipping rules in `script.js`:
   - `SHIPPING_FLAT_FEE`
   - `FREE_SHIPPING_THRESHOLD`
3. Upload `inventory.xlsx` in the project root to auto-load products from Excel.
4. Supported Excel column names (any one from each group works):
   - Name: `name` / `title` / `model` / `car`
   - Brand: `brand` / `make`
   - Category: `category` / `series` / `type`
   - Price: `price` / `sellingprice` / `mrp`
   - Stock: `quantity` / `qty` / `stock`
   - Image URL: `image` / `pic` / `photo` / `imageurl`
5. If `inventory.xlsx` is not present, the app falls back to `products.json`.
6. Update store name and text in `index.html` for your brand.

## Built-in shopping behavior

- Add to cart popup (item-added toast)
- Load More for handling large catalogs
- Click any product card to open its detail page (`product.html?id=<id>`)
- Advanced filters for category, brand, availability, and sorting
- Price range filter and clear-filters reset

## Run locally

Open `index.html` in your browser.

## Deploy

You can deploy quickly with Vercel:

`npx vercel --prod`

If CLI asks for login/token, authenticate first:

`npx vercel login`

## Next upgrades (optional)

- Add Razorpay or Stripe for direct online payments
- Connect to a backend/database for admin inventory management
- Add product detail pages and real order tracking
