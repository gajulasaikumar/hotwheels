const CART_STORAGE_KEY = "hot_wheels_cart_v1";
const PRODUCT_DATA_PATH = "./products.json";
const EXCEL_FILE_PATH = "./inventory.xlsx";
const IMAGE_FOLDER_PATH = "images/";
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80";

const fallbackProducts = [
  { id: 1, name: "Nissan Skyline GT-R R34", brand: "Hot Wheels", category: "Premium", price: 1499, condition: "Carded Mint", stock: 3, image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=80" },
  { id: 2, name: "Toyota Supra MK4", brand: "Hot Wheels", category: "Mainline", price: 699, condition: "Carded Mint", stock: 7, image: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80" },
  { id: 3, name: "Porsche 911 GT3 RS", brand: "Hot Wheels", category: "Boulevard", price: 1299, condition: "Near Mint", stock: 4, image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80" }
];

const productDetail = document.getElementById("productDetail");
const relatedGrid = document.getElementById("relatedGrid");
const floatingCartBtn = document.getElementById("floatingCartBtn");
const floatingCartCount = document.getElementById("floatingCartCount");

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function valueFromAliases(row, aliases) {
  const normalized = {};
  Object.keys(row).forEach((key) => {
    normalized[normalizeKey(key)] = row[key];
  });

  for (const alias of aliases) {
    const found = normalized[normalizeKey(alias)];
    if (found !== undefined && String(found).trim() !== "") return found;
  }
  return "";
}

function parsePrice(raw) {
  const cleaned = String(raw || "").replace(/[^0-9.]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function parseStock(raw) {
  const cleaned = String(raw || "").replace(/[^0-9-]/g, "");
  const value = Number.parseInt(cleaned, 10);
  return Number.isFinite(value) ? value : 0;
}

function parseDiscount(raw, mrp, salePrice) {
  const cleaned = String(raw || "").replace(/[^0-9.]/g, "");
  const direct = Number(cleaned);
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
  if (mrp > salePrice && salePrice > 0) {
    return Math.round(((mrp - salePrice) / mrp) * 100);
  }
  return 0;
}

function normalizeImagePath(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";

  const isAbsoluteUrl = /^(https?:)?\/\//i.test(value);
  const isInlineAsset = /^(data:|blob:)/i.test(value);
  const isRelativePath =
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("/") ||
    value.startsWith(IMAGE_FOLDER_PATH);

  if (isAbsoluteUrl || isInlineAsset || isRelativePath) return value;
  return `${IMAGE_FOLDER_PATH}${value}`;
}

function normalizeProduct(raw, index) {
  const name = String(valueFromAliases(raw, ["name", "title", "model", "car", "itemname", "productname"])).trim();
  const brand = String(valueFromAliases(raw, ["brand", "make", "manufacturer"])).trim() || "Hot Wheels";
  const category = String(valueFromAliases(raw, ["category", "series", "type", "line"])).trim() || "Mainline";
  const condition = String(valueFromAliases(raw, ["condition", "cardcondition"])).trim() || "Carded Good";
  const image1 = normalizeImagePath(valueFromAliases(raw, ["image", "imageurl", "pic", "photo", "url"]));
  const image2 = normalizeImagePath(valueFromAliases(raw, ["image2", "pic2", "photo2"]));
  const image3 = normalizeImagePath(valueFromAliases(raw, ["image3", "pic3", "photo3"]));
  const idRaw = valueFromAliases(raw, ["id", "sku", "productid"]);
  const priceRaw = valueFromAliases(raw, ["price", "sellingprice", "saleprice", "amount"]);
  const mrpRaw = valueFromAliases(raw, ["mrp", "originalprice", "listprice"]);
  const stockRaw = valueFromAliases(raw, ["stock", "quantity", "qty", "available"]);
  const discountRaw = valueFromAliases(raw, ["discount", "discountpercent", "off"]);
  const sku = String(valueFromAliases(raw, ["sku", "itemcode", "code", "productcode"])).trim();
  const scale = String(valueFromAliases(raw, ["scale", "size"])).trim();
  const year = String(valueFromAliases(raw, ["year", "modelyear"])).trim();
  const color = String(valueFromAliases(raw, ["color", "colour"])).trim();
  const series = String(valueFromAliases(raw, ["series", "set", "collection"])).trim();
  const material = String(valueFromAliases(raw, ["material"])).trim();
  const description = String(valueFromAliases(raw, ["description", "details", "about", "notes"])).trim();

  const id = Number.parseInt(String(idRaw), 10);
  const salePrice = parsePrice(priceRaw);
  const mrpPrice = parsePrice(mrpRaw);
  const finalPrice = salePrice > 0 ? salePrice : mrpPrice;

  return {
    id: Number.isFinite(id) ? id : index + 1,
    name,
    brand,
    category,
    price: finalPrice,
    mrp: mrpPrice,
    discountPercent: parseDiscount(discountRaw, mrpPrice, finalPrice),
    condition,
    stock: parseStock(stockRaw),
    image: image1 || PLACEHOLDER_IMAGE,
    images: [image1, image2, image3].filter(Boolean),
    sku,
    scale,
    year,
    color,
    series,
    material,
    description
  };
}

function mapRowToProduct(row, index) {
  return normalizeProduct(row, index);
}

function formatPrice(value) {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function getProductIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

function readCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function cartQty(cart = readCart()) {
  return cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
}

function updateFloatingCart() {
  if (!floatingCartBtn || !floatingCartCount) return;
  const qty = cartQty();
  floatingCartCount.textContent = `${qty} item${qty === 1 ? "" : "s"}`;
  const showBar = qty > 0;
  floatingCartBtn.hidden = !showBar;
  floatingCartBtn.style.display = showBar ? "" : "none";
}

function addToCart(product) {
  adjustCartQty(product, 1, true);
}

function setCartQty(product, targetQty, showToast = false) {
  if (!product) return;
  if (targetQty > product.stock) {
    alert("Only limited stock available.");
  }

  const qty = Math.max(0, Math.min(targetQty, product.stock));
  const cart = readCart();
  const index = cart.findIndex((item) => item.productId === product.id);

  if (qty === 0) {
    if (index >= 0) cart.splice(index, 1);
  } else if (index >= 0) {
    cart[index].qty = qty;
  } else {
    cart.push({ productId: product.id, qty });
  }

  saveCart(cart);
  renderProduct(product);
  updateFloatingCart();
}

function adjustCartQty(product, delta, showToast = false) {
  const cart = readCart();
  const existing = cart.find((item) => item.productId === product.id);
  const currentQty = existing ? existing.qty : 0;
  setCartQty(product, currentQty + delta, showToast);
}

function renderProduct(product) {
  const buttonDisabled = product.stock <= 0 ? "disabled" : "";
  const stockText = product.stock <= 0 ? "Sold Out" : `In stock: ${product.stock}`;
  const galleryImages = product.images && product.images.length ? product.images : [product.image || PLACEHOLDER_IMAGE];
  const cart = readCart();
  const existing = cart.find((item) => item.productId === product.id);
  const cartQty = existing ? existing.qty : 0;
  const specItems = [
    product.sku ? `SKU: ${product.sku}` : "",
    product.brand ? `Brand: ${product.brand}` : "",
    product.series ? `Series: ${product.series}` : "",
    product.scale ? `Scale: ${product.scale}` : "",
    product.condition ? `Condition: ${product.condition}` : ""
  ].filter(Boolean);
  const showMrp = Number(product.mrp) > Number(product.price);
  const showDiscount = Number(product.discountPercent) > 0;
  productDetail.innerHTML = `
    <article class="detail-card">
      <div class="detail-image-wrap">
        <img id="detailMainImage" src="${galleryImages[0]}" alt="${product.name}">
        ${galleryImages.length > 1 ? `
          <div class="detail-thumbs">
            ${galleryImages.map((image, idx) => `
              <button class="thumb-btn ${idx === 0 ? "active" : ""}" data-image="${image}" aria-label="View image ${idx + 1}">
                <img src="${image}" alt="${product.name} ${idx + 1}">
              </button>
            `).join("")}
          </div>
        ` : ""}
      </div>
      <div class="detail-info">
        <p class="eyebrow">${product.category}</p>
        <h1>${product.name}</h1>
        <p class="detail-stock">${stockText}</p>
        <div class="detail-price-row">
          <p class="detail-price">${formatPrice(product.price)}</p>
          ${showMrp ? `<p class="old-price detail-old">${formatPrice(product.mrp)}</p>` : ""}
          ${showDiscount ? `<span class="discount-pill">${product.discountPercent}% OFF</span>` : ""}
        </div>
        ${product.description ? `<p class="meta desc">${product.description}</p>` : ""}
        ${specItems.length ? `<ul class="detail-specs">${specItems.map((line) => `<li>${line}</li>`).join("")}</ul>` : ""}
        <div class="hero-actions">
          ${
            cartQty > 0
              ? `
                <div class="qty-control">
                  <button id="detailQtyDec" class="qty-btn">-</button>
                  <span class="qty-num">${cartQty}</span>
                  <button id="detailQtyInc" class="qty-btn" ${cartQty >= product.stock ? "disabled" : ""}>+</button>
                </div>
              `
              : `<button id="detailAddBtn" class="btn-primary" ${buttonDisabled}>Add to Cart</button>`
          }
          <a class="btn-secondary" href="index.html#hotwheels">Continue Shopping</a>
        </div>
      </div>
    </article>
  `;

  const addBtn = document.getElementById("detailAddBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => addToCart(product));
  }

  const incBtn = document.getElementById("detailQtyInc");
  if (incBtn) {
    incBtn.addEventListener("click", () => adjustCartQty(product, 1));
  }

  const decBtn = document.getElementById("detailQtyDec");
  if (decBtn) {
    decBtn.addEventListener("click", () => adjustCartQty(product, -1));
  }

  const mainImage = document.getElementById("detailMainImage");
  const thumbButtons = Array.from(document.querySelectorAll(".thumb-btn"));
  thumbButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mainImage.src = button.dataset.image;
      thumbButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });
}

function renderRelated(products, currentProduct) {
  const related = products
    .filter((item) => item.id !== currentProduct.id && item.category === currentProduct.category)
    .slice(0, 4);

  if (!related.length) {
    relatedGrid.innerHTML = "<p>No related products found.</p>";
    return;
  }

  relatedGrid.innerHTML = related
    .map((item) => `
      <a href="product.html?id=${item.id}" class="tile product-link arrival-card arrival-link">
        <img loading="lazy" decoding="async" src="${item.image || PLACEHOLDER_IMAGE}" alt="${item.name}">
        <div class="arrival-body">
          <h4>${item.name}</h4>
          <p>${item.brand} | ${item.category}</p>
          <p class="arrival-price">${formatPrice(item.price)}</p>
        </div>
      </a>
    `)
    .join("");
}

async function loadProducts() {
  if (typeof XLSX !== "undefined") {
    try {
      const excelResponse = await fetch(EXCEL_FILE_PATH, { cache: "no-store" });
      if (excelResponse.ok) {
        const buffer = await excelResponse.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
        const mapped = rows
          .map((row, index) => mapRowToProduct(row, index))
          .filter((item) => item.name && Number.isFinite(item.price));
        if (mapped.length) return mapped;
      }
    } catch (error) {
      // Continue to JSON fallback if Excel is not found or invalid.
    }
  }

  try {
    const response = await fetch(PRODUCT_DATA_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error("Cannot load products");
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error("Invalid products data");
    return data.map((item, index) => normalizeProduct(item, index));
  } catch {
    return fallbackProducts.map((item, index) => normalizeProduct(item, index));
  }
}

async function init() {
  const products = await loadProducts();
  const productId = getProductIdFromQuery();
  const selected = products.find((item) => item.id === productId) || products[0];
  if (!selected) {
    productDetail.innerHTML = "<p>Product not found.</p>";
    return;
  }
  renderProduct(selected);
  renderRelated(products, selected);
  updateFloatingCart();
}

init();
